import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Select, Checkbox, AutoComplete, message, theme } from 'antd';
import { MinusCircleOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { useUpdateInventory, useConfigurarRoles } from '../hooks/useInventory';

const TIPO_OPTIONS = [
  { value: 'integer', label: 'N° Entero' },
  { value: 'natural', label: 'N° Natural' },
  { value: 'float',   label: 'N° Decimal' },
  { value: 'string',  label: 'Texto' },
  { value: 'boolean', label: 'Casilla' },
  { value: 'date',    label: 'Fecha' },
];

// Mismo criterio que `_conversion_es_segura` en el backend
// (app/tenant/inventarios.py): si el tipo de un atributo cambia, decide si
// el valor que ya tienen los items se puede migrar sin adivinar, o si hay
// que avisarle al usuario ANTES de guardar que se va a perder. Duplicado a
// propósito (es una regla de 4 líneas) en vez de depender de una llamada al
// backend solo para mostrar este aviso.
const TIPOS_NUMERICOS = new Set(['integer', 'int', 'natural', 'float', 'number']);

const TIPOS_NUMERICOS_UNIDAD = new Set(['integer', 'natural', 'float']);
const UNIDADES_SUGERIDAS = ['$', 'USD', '€', 'kg', 'g', 'L', 'm', 'cm', 'm³', 'un'];

const NOMBRE_TIPO: Record<string, string> = {
  string: 'Texto', str: 'Texto',
  integer: 'Número entero', int: 'Número entero',
  natural: 'Número natural',
  float: 'Número decimal', number: 'Número decimal',
  boolean: 'Casilla (Sí/No)', bool: 'Casilla (Sí/No)',
  date: 'Fecha',
};

const nombreTipo = (tipo: string): string => NOMBRE_TIPO[tipo] ?? tipo;

function normalizarTipo(tipo: string): string {
  if (tipo === 'int') return 'integer';
  if (tipo === 'number') return 'float';
  return tipo;
}

function conversionEsSegura(tipoViejo: string, tipoNuevo: string): boolean {
  const tv = normalizarTipo(tipoViejo);
  const tn = normalizarTipo(tipoNuevo);
  if (tv === tn) return true;
  if (TIPOS_NUMERICOS.has(tv) && TIPOS_NUMERICOS.has(tn)) return true;
  if (TIPOS_NUMERICOS.has(tv) && tn === 'string') return true;
  return false;
}

// Conversión que conserva los valores válidos pero puede descartar algunos:
// pasar un numérico a natural mantiene los >= 0 y descarta los negativos
// (y trunca decimales). No es una pérdida total como conversionEsSegura=false,
// así que se avisa con un mensaje más suave.
function perdidaParcialANatural(tipoViejo: string, tipoNuevo: string): boolean {
  const tv = normalizarTipo(tipoViejo);
  const tn = normalizarTipo(tipoNuevo);
  return tn === 'natural' && tv !== 'natural' && TIPOS_NUMERICOS.has(tv);
}

// Espejo del Registry del backend (app/tenant/roles_atributos.py): mismos
// roles, mismos tipos permitidos. Agregar un rol acá y allá es el único
// cambio necesario para soportar uno nuevo — ni este componente ni el
// backend necesitan lógica condicional por rol.
const ROLES_CONFIG: { key: string; label: string; tiposPermitidos: string[] }[] = [
  { key: 'volumen_unitario', label: 'Volumen unitario (para calcular el volumen total ocupado)', tiposPermitidos: ['integer', 'float'] },
  { key: 'fecha_reposicion', label: 'Fecha de reposición', tiposPermitidos: ['date'] },
  { key: 'proveedor',        label: 'Proveedor',           tiposPermitidos: ['string'] },
];

interface AtributoFormValue {
  nombre?: string;
  tipo?: string;
  unidad?: string;
}

interface ModalEditInventoryProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryId: number;
  currentName: string;
  currentAtributos: Record<string, string>;
  currentUnidades?: Record<string, string>;
  currentRolesAtributos?: Record<string, string>;
  currentFotosHabilitadas?: boolean;
}

export const ModalEditInventory: React.FC<ModalEditInventoryProps> = ({
  isOpen,
  onClose,
  inventoryId,
  currentName,
  currentAtributos = {},
  currentUnidades = {},
  currentRolesAtributos = {},
  currentFotosHabilitadas = false,
}) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const { mutate: updateInventory, isPending } = useUpdateInventory();
  const { mutate: configurarRoles, isPending: isPendingRoles } = useConfigurarRoles();

  // Se re-renderiza cada vez que se agrega/quita/renombra/cambia el tipo de
  // un atributo en el Form.List de abajo — así los Select de roles siempre
  // ofrecen, en vivo, los atributos que existen EN ESTE MOMENTO del form
  // (incluidos los que el usuario acaba de agregar sin guardar todavía).
  const atributosWatch: AtributoFormValue[] = Form.useWatch('atributos', form) || [];

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        nombre: currentName,
        // `original_nombre`/`original_tipo` no tienen Form.Item propio
        // (igual que `isNew`): viajan "escondidos" en el store del form para
        // poder detectar, al guardar, si el usuario renombró un atributo ya
        // existente y/o le cambió el tipo — ver handleSubmit.
        atributos: Object.entries(currentAtributos).map(([nombre, tipo]) => ({ nombre, tipo, unidad: currentUnidades[nombre], isNew: false, original_nombre: nombre, original_tipo: tipo })),
        roles: currentRolesAtributos,
        fotos_habilitadas: currentFotosHabilitadas,
      });
    }
  }, [isOpen, currentName, currentAtributos, currentUnidades, currentRolesAtributos, currentFotosHabilitadas, form]);

  const makeDefaultValidator = (fieldName: number) => ({
    validator(_: unknown, value: string) {
      if (!value) return Promise.resolve();
      const tipo: string = form.getFieldValue(['atributos', fieldName, 'tipo']);
      switch (tipo) {
        case 'integer':
          return /^-?\d+$/.test(value)
            ? Promise.resolve()
            : Promise.reject(new Error('Debe ser un número entero'));
        case 'natural':
          return /^\d+$/.test(value)
            ? Promise.resolve()
            : Promise.reject(new Error('Debe ser un número natural (0 o mayor)'));
        case 'float':
        case 'number':
          return /^-?\d+(\.\d+)?$/.test(value)
            ? Promise.resolve()
            : Promise.reject(new Error('Debe ser un número decimal'));
        case 'boolean':
          return ['true', 'false'].includes(value.toLowerCase())
            ? Promise.resolve()
            : Promise.reject(new Error('Debe ser true o false'));
        case 'date':
          return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
            ? Promise.resolve()
            : Promise.reject(new Error('Formato inválido (YYYY-MM-DD)'));
        default:
          return Promise.resolve();
      }
    },
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const atributosFormateados: Record<string, string> = {};
      const defaults: Record<string, unknown> = {};
      // Atributos que el usuario renombró (nombre_viejo -> nombre_nuevo) en
      // vez de borrar y crear uno nuevo — se detecta comparando el nombre
      // actual contra `original_nombre` (ver el useEffect de arriba). Sin
      // esto, el backend trataba cualquier cambio de nombre como "borrar el
      // atributo viejo + agregar uno nuevo vacío", perdiendo el valor ya
      // cargado en todos los items del inventario.
      const renombresAtributos: Record<string, string> = {};
      // Atributos donde el tipo cambió a algo que no se puede convertir sin
      // adivinar (ver conversionEsSegura) — el backend los va a vaciar, así
      // que hay que avisar y pedir confirmación antes de guardar.
      const cambiosDeTipoRiesgosos: { nombre: string; tipoViejo: string; tipoNuevo: string }[] = [];
      // Atributos que pasan a natural desde otro numérico: se conservan los
      // valores >= 0 y se descartan los negativos/decimales — pérdida parcial,
      // aviso más suave que cambiosDeTipoRiesgosos.
      const cambiosParciales: { nombre: string; tipoViejo: string; tipoNuevo: string }[] = [];
      // Unidad/moneda por atributo numérico. Reemplazo completo, igual que
      // atributos/roles: se manda el estado actual del form.
      const unidades: Record<string, string> = {};

      if (values.atributos) {
        values.atributos.forEach((attr: { nombre: string; tipo: string; default?: string; unidad?: string }, index: number) => {
          if (attr?.nombre) {
            atributosFormateados[attr.nombre] = attr.tipo;
            if (attr.default) defaults[attr.nombre] = attr.default;
            const simbolo = attr.unidad?.trim();
            if (simbolo && TIPOS_NUMERICOS_UNIDAD.has(attr.tipo)) {
              unidades[attr.nombre] = simbolo;
            }
            // `original_nombre`/`original_tipo` no tienen Form.Item propio,
            // así que no llegan en `values` — se leen directo del store,
            // igual que `isNew`.
            const nombreOriginal = form.getFieldValue(['atributos', index, 'original_nombre']);
            if (nombreOriginal && nombreOriginal !== attr.nombre) {
              renombresAtributos[nombreOriginal] = attr.nombre;
            }
            const tipoOriginal = form.getFieldValue(['atributos', index, 'original_tipo']);
            if (tipoOriginal && tipoOriginal !== attr.tipo) {
              if (!conversionEsSegura(tipoOriginal, attr.tipo)) {
                cambiosDeTipoRiesgosos.push({
                  nombre: nombreOriginal || attr.nombre,
                  tipoViejo: tipoOriginal,
                  tipoNuevo: attr.tipo,
                });
              } else if (perdidaParcialANatural(tipoOriginal, attr.tipo)) {
                cambiosParciales.push({
                  nombre: nombreOriginal || attr.nombre,
                  tipoViejo: tipoOriginal,
                  tipoNuevo: attr.tipo,
                });
              }
            }
          }
        });
      }

      const payload: { nombre: string; atributos: Record<string, string>; defaults?: Record<string, unknown>; renombres_atributos?: Record<string, string>; unidades: Record<string, string>; fotos_habilitadas: boolean } = {
        nombre: values.nombre,
        atributos: atributosFormateados,
        unidades,
        fotos_habilitadas: Boolean(values.fotos_habilitadas),
      };
      if (Object.keys(defaults).length > 0) payload.defaults = defaults;
      if (Object.keys(renombresAtributos).length > 0) payload.renombres_atributos = renombresAtributos;

      // roles_atributos es un reemplazo completo (mismo criterio que
      // "atributos" acá arriba): se manda el estado completo del form,
      // descartando los roles que el usuario dejó sin asignar (allowClear).
      // Si el atributo asignado a un rol fue renombrado y el usuario no
      // volvió a tocar ese selector, el Select sigue guardando el nombre
      // VIEJO (las opciones se recalculan con el nombre nuevo, pero el valor
      // seleccionado no se actualiza solo) — se lo remapea acá para no pisar,
      // con este PATCH que sale justo después, el arreglo que ya hizo el PUT
      // de más arriba.
      const rolesAtributos: Record<string, string> = {};
      if (values.roles) {
        Object.entries(values.roles as Record<string, string | undefined>).forEach(([rol, atributo]) => {
          if (atributo) rolesAtributos[rol] = renombresAtributos[atributo] || atributo;
        });
      }

      const guardar = () => {
        updateInventory(
          { id: inventoryId, payload },
          {
            onSuccess: () => {
              // Los roles se configuran DESPUÉS de que los atributos ya se
              // guardaron: si el usuario asignó un rol a un atributo que
              // recién está agregando en este mismo submit, el backend
              // todavía no lo conoce hasta que este PUT termina.
              configurarRoles(
                { id: inventoryId, roles_atributos: rolesAtributos },
                {
                  onSuccess: () => {
                    message.success('Inventario, atributos y roles actualizados');
                    form.resetFields();
                    onClose();
                  },
                  onError: (error) => {
                    console.error(error);
                    message.error('Los atributos se guardaron, pero falló la configuración de roles especiales');
                  },
                }
              );
            },
            onError: (error) => {
              console.error(error);
              message.error('No se pudo actualizar el inventario');
            }
          }
        );
      };

      if (cambiosDeTipoRiesgosos.length > 0 || cambiosParciales.length > 0) {
        Modal.confirm({
          title: cambiosDeTipoRiesgosos.length > 0 ? 'Se pueden perder valores cargados' : 'Algunos valores pueden perderse',
          icon: <WarningOutlined style={{ color: token.colorWarning }} />,
          content: (
            <div>
              {cambiosDeTipoRiesgosos.length > 0 && (
                <>
                  <p>No hay forma de convertir automáticamente el valor que ya cargaste para:</p>
                  <ul>
                    {cambiosDeTipoRiesgosos.map((c) => (
                      <li key={c.nombre}>
                        <b>{c.nombre}</b>: {nombreTipo(c.tipoViejo)} → {nombreTipo(c.tipoNuevo)}
                      </li>
                    ))}
                  </ul>
                  <p>Los items van a quedar sin valor cargado en {cambiosDeTipoRiesgosos.length === 1 ? 'ese atributo' : 'esos atributos'}.</p>
                </>
              )}
              {cambiosParciales.length > 0 && (
                <>
                  <p>Al pasar a natural se conservan los valores de 0 o más, pero se van a descartar los negativos (y se truncan los decimales) en:</p>
                  <ul>
                    {cambiosParciales.map((c) => (
                      <li key={c.nombre}>
                        <b>{c.nombre}</b>: {nombreTipo(c.tipoViejo)} → {nombreTipo(c.tipoNuevo)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p>¿Continuar de todas formas?</p>
            </div>
          ),
          okText: 'Sí, continuar',
          okButtonProps: { danger: true },
          cancelText: 'Cancelar',
          onOk: guardar,
        });
        return;
      }

      guardar();
    }).catch(console.log);
  };

  return (
    <Modal
      title="Editar Inventario y Atributos"
      open={isOpen}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending || isPendingRoles}
      okText="Guardar Cambios"
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form form={form} layout="vertical">

        <Form.Item
          name="nombre"
          label="Nombre del Inventario"
          rules={[{ required: true, message: 'Ingresá un nombre' }]}
        >
          <Input placeholder="Ej: Verdulería" />
        </Form.Item>

        <Form.Item name="fotos_habilitadas" valuePropName="checked" style={{ marginBottom: 16 }}>
          <Checkbox>
            Los artículos de este inventario tienen foto
          </Checkbox>
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', paddingBottom: 8 }}>Columnas / Atributos del Inventario</label>
          <Form.List name="atributos">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => {
                  const isNew = form.getFieldValue(['atributos', field.name, 'isNew']);
                  return (
                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline" wrap>
                      <Form.Item
                        name={[field.name, 'nombre']}
                        rules={[{ required: true, message: 'El nombre no puede estar vacío' }]}
                        style={{ margin: 0 }}
                      >
                        <Input placeholder="Ej: Marca, Tamaño" style={{ width: '160px' }} />
                      </Form.Item>

                      <Form.Item
                        name={[field.name, 'tipo']}
                        rules={[{ required: true, message: 'Elegí un tipo' }]}
                        style={{ margin: 0 }}
                      >
                        <Select
                          placeholder="Tipo"
                          style={{ width: '120px' }}
                          options={TIPO_OPTIONS}
                        />
                      </Form.Item>

                      {TIPOS_NUMERICOS_UNIDAD.has(atributosWatch[field.name]?.tipo ?? '') && (
                        <Form.Item name={[field.name, 'unidad']} style={{ margin: 0 }}>
                          <AutoComplete
                            options={UNIDADES_SUGERIDAS.map((u) => ({ value: u }))}
                            style={{ width: '110px' }}
                          >
                            <Input placeholder="Unidad ($, kg…)" maxLength={8} />
                          </AutoComplete>
                        </Form.Item>
                      )}

                      {isNew && (
                        <Form.Item
                          name={[field.name, 'default']}
                          rules={[makeDefaultValidator(field.name)]}
                          style={{ margin: 0 }}
                        >
                          <Input placeholder="Default (opcional)" style={{ width: '160px' }} />
                        </Form.Item>
                      )}
                      
                      <MinusCircleOutlined
                        style={{ color: 'red', fontSize: '18px' }}
                        onClick={() => remove(field.name)}
                      />
                    </Space>
                  );
                })}

                <Form.Item style={{ marginTop: 16 }}>
                <Button type="dashed" onClick={() => add({ isNew: true })} block icon={<PlusOutlined />}>
                    Agregar nuevo atributo
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>

        <div style={{
          padding:      '16px',
          background:   token.colorFillAlter,
          borderRadius: token.borderRadiusLG,
          border:       `1px solid ${token.colorBorderSecondary}`,
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 4, color: token.colorText }}>
            Roles Especiales (opcional)
          </h4>
          <p style={{ fontSize: '12px', color: token.colorTextTertiary, marginBottom: 16 }}>
            Marcá qué atributo cumple cada rol. Solo se ofrecen los atributos ya definidos arriba que tengan el tipo que ese rol necesita.
          </p>

          {ROLES_CONFIG.map((rol) => {
            const opciones = atributosWatch
              .filter((a) => a?.nombre && a?.tipo && rol.tiposPermitidos.includes(a.tipo))
              .map((a) => ({ value: a.nombre as string, label: `${a.nombre} (${a.tipo})` }));

            return (
              <Form.Item
                key={rol.key}
                name={['roles', rol.key]}
                label={rol.label}
                style={{ marginBottom: 12 }}
              >
                <Select
                  allowClear
                  placeholder={opciones.length ? 'Sin asignar' : `No hay atributos ${rol.tiposPermitidos.join('/')} definidos`}
                  options={opciones}
                  disabled={opciones.length === 0}
                />
              </Form.Item>
            );
          })}
        </div>

      </Form>
    </Modal>
  );
};
