import random
import json

def generate_sql():
    schema = "tenant_milton"
    output_file = "populate_flex_inventory.sql"
    
    # Pools de datos para generar claves y valores aleatorios
    marcas = ["Logitech", "Razer", "Corsair", "ASUS", "MSI", "Samsung", "LG", "Dell", "HP", "Sony", "Intel", "AMD"]
    keys_pool = ["version", "tag_intern", "code_ref", "material", "peso_neto", "origen", "garantia", "voltaje", "frágil", "prioridad", "estante", "pasillo", "normativa_iso", "eco_friendly", "ultima_revision"]
    values_pool = ["A-100", "B-200", "Premium", "Standard", "China", "Argentina", "USA", "24m", "12m", "High", "Low", "True", "False", "V-2026", "Nivel-7"]

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"SET search_path TO {schema};\n\n")

        # 1. GENERAR 50 INVENTARIOS CON LONGITUD DE ATRIBUTOS VARIABLE
        f.write("-- POBLAR INVENTARIOS\n")
        inventarios_data = []
        locaciones = ["Depósito", "Almacén", "Sucursal", "Warehouse", "Hub"]
        
        for i in range(1, 51):
            nombre_inv = f"{random.choice(locaciones)} {random.choice(marcas)} {i}"
            
            # Decidir longitud: 4, 6, 8 o 10 atributos
            num_attrs = random.choice([4, 6, 8, 10])
            # Generar atributos aleatorios únicos para este inventario
            attrs_inv = {random.choice(keys_pool) + f"_{j}": random.choice(values_pool) for j in range(num_attrs)}
            
            f.write(f"INSERT INTO inventario (nombre, atributos) VALUES ('{nombre_inv}', '{json.dumps(attrs_inv)}');\n")
            inventarios_data.append({"id": i, "base_attrs": attrs_inv})

        # 2. GENERAR 800 ITEMS (Heredan estructura del inventario + extras)
        f.write("\n-- POBLAR ITEMS\n")
        componentes = ["Monitor", "Teclado", "Mouse", "SSD", "RAM", "GPU", "CPU", "Hub USB", "Cable HDMI"]
        for i in range(1, 801):
            inv = random.choice(inventarios_data)
            nombre_item = f"{random.choice(marcas)} {random.choice(componentes)} Model-{random.randint(1000, 9999)}"
            
            # Mezclamos: Atributos del inventario + 2 o 3 específicos del item
            item_attrs = inv["base_attrs"].copy()
            item_attrs["item_serial"] = f"SN-{random.getrandbits(32)}"
            item_attrs["calidad_check"] = random.choice(["OK", "Pending", "Passed"])
            
            f.write(f"INSERT INTO item (nombre, cantidad, inventario_id, atributos) VALUES ('{nombre_item}', {random.randint(0, 1000)}, {inv['id']}, '{json.dumps(item_attrs)}');\n")

        # 3. GENERAR 100 CATÁLOGOS
        f.write("\n-- POBLAR CATÁLOGOS\n")
        for i in range(1, 101):
            nombre_cat = f"Catálogo {random.choice(['Ofertas', 'Invierno', 'Premium', 'Outlet'])} #{i}"
            f.write(f"INSERT INTO catalogo (nombre, descripcion) VALUES ('{nombre_cat}', 'Descripción aleatoria para el catálogo {i}');\n")

        # 4. RELACIÓN ALEATORIA CATÁLOGO-ITEM (Sin respetar estructura)
        f.write("\n-- POBLAR RELACIÓN CATÁLOGO_ITEM\n")
        relaciones = set()
        # Generamos entre 1000 y 2000 relaciones al azar
        total_relaciones = random.randint(1000, 2000)
        
        while len(relaciones) < total_relaciones:
            cat_id = random.randint(1, 100)
            item_id = random.randint(1, 800)
            if (cat_id, item_id) not in relaciones:
                f.write(f"INSERT INTO catalogo_item (catalogo_id, item_id) VALUES ({cat_id}, {item_id});\n")
                relaciones.add((cat_id, item_id))

    print(f"Archivo '{output_file}' generado.")
    print(f"Se crearon {len(relaciones)} relaciones aleatorias entre catálogos e ítems.")

if __name__ == "__main__":
    generate_sql()