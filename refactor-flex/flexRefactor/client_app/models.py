from django.db import models

class Attribute(models.Model):
    """
    Define un tipo de atributo que puede ser asociado a un inventario o ítem.
    Corresponde a la tabla "api-base"."attribute".
    """
    # id (serial4) es automático en Django como models.AutoField
    
    type = models.CharField(
        max_length=255, 
        unique=True, 
        null=False,
        help_text="Tipo de dato del atributo (Ej: Texto, Número, Fecha)"
    )
    name = models.CharField(
        max_length=255, 
        null=False,
        help_text="Nombre descriptivo del atributo (Ej: Color, Peso, Ubicación)"
    )

    class Meta:
        # Esto es solo un ejemplo de cómo se vería si estuviera en un app llamado 'inventory'
        db_table = 'attribute' 
        verbose_name = 'Atributo Maestro'
        verbose_name_plural = 'Atributos Maestros'

    def __str__(self):
        return self.name

class Catalog(models.Model):
    """
    Representa un catálogo de ítems, un grupo lógico de productos o bienes.
    Corresponde a la tabla "api-base"."catalog".
    """
    name = models.CharField(max_length=255, null=False)
    description = models.TextField(null=True, blank=True)
    
    # La fecha de revisión puede ser nula
    revision_date = models.DateField(null=True, blank=True)
    
    # creation_date es NOT NULL. Se usa auto_now_add=True para establecerlo solo al crear.
    creation_date = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'catalog'
        verbose_name = 'Catálogo'
        verbose_name_plural = 'Catálogos'

    def __str__(self):
        return self.name

class Inventory(models.Model):
    """
    Representa una instancia de Inventario o Almacén principal.
    Corresponde a la tabla "api-base".inventory.
    """
    name = models.CharField(max_length=255, null=False)
    # Usamos TextField ya que el tipo SQL es text y es NOT NULL
    description = models.TextField(null=False) 
    revision_date = models.DateField(null=True, blank=True)
    creation_date = models.DateField(auto_now_add=True)

    # Relación Many-to-Many con Attribute, definida explícitamente a través de InventoryAttribute
    attributes = models.ManyToManyField(
        Attribute,
        through='InventoryAttribute',
        related_name='inventories_associated'
    )

    class Meta:
        db_table = 'inventory'
        verbose_name = 'Inventario'
        verbose_name_plural = 'Inventarios'

    def __str__(self):
        return self.name

class InventoryAttribute(models.Model):
    """
    Tabla intermedia que asocia un Inventario con un Atributo.
    Corresponde a la tabla "api-base".inventory_attribute.
    """
    inventory = models.ForeignKey(
        Inventory, 
        on_delete=models.CASCADE, 
        null=False
    )
    attribute = models.ForeignKey(
        Attribute, 
        on_delete=models.RESTRICT, # ON DELETE RESTRICT
        null=False
    )

    class Meta:
        db_table = 'inventory_attribute'
        verbose_name = 'Inventario-Atributo'
        verbose_name_plural = 'Inventario-Atributos'
        # Constraint UNIQUE (inventory_id, attribute_id)
        unique_together = ('inventory', 'attribute')

    def __str__(self):
        return f'{self.inventory.name} - {self.attribute.name}'

class Item(models.Model):
    """
    Representa un ítem o producto dentro de un inventario.
    Corresponde a la tabla "api-base".item.
    """
    name = models.CharField(max_length=255, null=False)
    creation_date = models.DateField(auto_now_add=True)

    # inventory_id int4 NULL | ON DELETE SET NULL
    inventory = models.ForeignKey(
        Inventory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='items'
    )
    
    # Relación Many-to-Many con Attribute, definida a través de ItemAttributeValue
    attributes = models.ManyToManyField(
        Attribute,
        through='ItemAttributeValue',
        related_name='items_with_value'
    )

    # Relación Many-to-Many con Catalog, definida a través de CatalogItem
    catalogs = models.ManyToManyField(
        Catalog,
        through='CatalogItem',
        related_name='cataloged_items'
    )


    class Meta:
        db_table = 'item'
        verbose_name = 'Ítem'
        verbose_name_plural = 'Ítems'

    def __str__(self):
        return self.name

class ItemAttributeValue(models.Model):
    """
    Almacena el valor real de un atributo para un ítem específico.
    Corresponde a la tabla "api-base".item_attribute_value.
    """
    item = models.ForeignKey(
        Item, 
        on_delete=models.CASCADE, # ON DELETE CASCADE
        null=False
    )
    attribute = models.ForeignKey(
        Attribute, 
        on_delete=models.RESTRICT, # ON DELETE RESTRICT
        null=False
    )
    # El valor del atributo (el tipo es text)
    value = models.TextField(null=False) 

    class Meta:
        db_table = 'item_attribute_value'
        verbose_name = 'Valor de Atributo de Ítem'
        verbose_name_plural = 'Valores de Atributo de Ítems'
        # Constraint UNIQUE (item_id, attribute_id)
        unique_together = ('item', 'attribute')

    def __str__(self):
        return f'{self.item.name}: {self.attribute.name} = {self.value}'


class CatalogItem(models.Model):
    """
    Tabla intermedia para la relación Many-to-Many entre Catalog e Item.
    Corresponde a la tabla "api-base".catalog_item.
    """
    catalog = models.ForeignKey(
        Catalog, 
        on_delete=models.CASCADE, 
        null=False
    )
    item = models.ForeignKey(
        Item, 
        on_delete=models.CASCADE, 
        null=False
    )
    # Campo "organisation" int4 NULL
    organisation = models.IntegerField(null=True, blank=True)
    
    # id serial4 NOT NULL (es la PK)

    class Meta:
        db_table = 'catalog_item'
        verbose_name = 'Catálogo-Ítem'
        verbose_name_plural = 'Catálogo-Ítems'
        # Nota: La tabla SQL original no tenía un unique_together,
        # solo una PK 'id', permitiendo el mismo item en el mismo catálogo.
        # Si esto es un error en el SQL, deberías añadir:
        # unique_together = ('catalog', 'item')

    def __str__(self):
        return f'{self.catalog.name} contiene {self.item.name}'

### MODELOS PARA USUARIOS Y ROLES ###
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
import uuid

# NOTA IMPORTANTE:
# Estos modelos están diseñados para residir en los esquemas replicados
# por Tenant (via django-tenants), aislando así los usuarios y roles de cada inquilino.
# El esquema "api-users" de tu SQL se traduce a las tablas dentro del esquema del Tenant.


class Privilege(models.Model):
    """
    Define un permiso específico (ej. INVENTORY_READ, USER_CREATE).
    Corresponde a la tabla "api-users".privilege.
    Usamos IntegerField para smallserial (int2) para compatibilidad general.
    """
    id = models.SmallAutoField(primary_key=True)
    name = models.CharField(
        max_length=255, 
        unique=True, 
        null=False
    )
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'privilege'
        verbose_name = 'Privilegio'
        verbose_name_plural = 'Privilegios'

    def __str__(self):
        return self.name

class Role(models.Model):
    """
    Define un rol (ej. Gerente, Contador, Operador) al que se asignan Privilegios.
    Corresponde a la tabla "api-users"."role".
    """
    id = models.SmallAutoField(primary_key=True)
    name = models.CharField(
        max_length=255, 
        unique=True, 
        null=False
    )
    
    # Relación Many-to-Many: Un rol tiene muchos privilegios (PrivilegeRole)
    privileges = models.ManyToManyField(
        Privilege,
        through='PrivilegeRole',
        related_name='roles_with_privilege'
    )

    class Meta:
        db_table = 'role'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.name

class User(models.Model):
    """
    Representa a un empleado o usuario interno del Tenant.
    Corresponde a la tabla "api-users"."user".
    """
    id = models.SmallAutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True, null=False)
    
    # Guardamos el hash de la contraseña.
    password = models.CharField(max_length=255, null=False)
    
    # El campo state (bool NOT NULL)
    state = models.BooleanField(default=True)
    
    # creation_date (date NOT NULL)
    creation_date = models.DateField(default=timezone.now)
    
    # email (varchar NOT NULL) con restricción de unicidad
    email = models.CharField(max_length=255, unique=True, null=False)

    # tenant_uuid uuid DEFAULT gen_random_uuid() NOT NULL
    # NOTA: En django-tenants, este campo no es estrictamente necesario 
    # en los modelos de inquilinos, ya que el esquema ya aísla la pertenencia.
    # Lo incluimos por fidelidad al SQL, pero es redundante bajo django-tenants.
    tenant_uuid = models.UUIDField(
        default=uuid.uuid4, 
        unique=True, 
        null=False
    )

    # Relación Many-to-Many: Un usuario tiene muchos roles (UserRole)
    roles = models.ManyToManyField(
        Role,
        through='UserRole',
        related_name='users_with_role'
    )

    class Meta:
        db_table = 'user'
        verbose_name = 'Usuario Interno'
        verbose_name_plural = 'Usuarios Internos'

    # Métodos para manejar la contraseña (buenas prácticas en Django)
    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def __str__(self):
        return self.name

# --- Tablas Intermedias (Through Models) ---

class PrivilegeRole(models.Model):
    """
    Asocia un Privilegio con un Rol (Many-to-Many).
    Corresponde a la tabla "api-users".privilege_role.
    """
    id = models.SmallAutoField(primary_key=True)
    
    # id_privilege int2 NOT NULL | ON DELETE CASCADE
    privilege = models.ForeignKey(
        Privilege, 
        on_delete=models.CASCADE, 
        null=False
    )
    
    # id_role int2 NOT NULL | ON DELETE CASCADE
    role = models.ForeignKey(
        Role, 
        on_delete=models.CASCADE, 
        null=False
    )

    class Meta:
        db_table = 'privilege_role'
        verbose_name = 'Privilegio-Rol'
        verbose_name_plural = 'Privilegios-Roles'
        # Podrías añadir unique_together = ('privilege', 'role') si es necesario.

    def __str__(self):
        return f'{self.role.name} tiene permiso: {self.privilege.name}'


class UserRole(models.Model):
    """
    Asocia un Usuario con un Rol (Many-to-Many).
    Corresponde a la tabla "api-users".user_role.
    """
    id = models.SmallAutoField(primary_key=True)
    
    # id_role int2 NOT NULL | ON DELETE CASCADE
    role = models.ForeignKey(
        Role, 
        on_delete=models.CASCADE, 
        null=False
    )
    
    # id_user int2 NOT NULL | ON DELETE CASCADE
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=False
    )

    class Meta:
        db_table = 'user_role'
        verbose_name = 'Usuario-Rol'
        verbose_name_plural = 'Usuarios-Roles'
        # Podrías añadir unique_together = ('user', 'role') si es necesario.

    def __str__(self):
        return f'{self.user.name} es {self.role.name}'