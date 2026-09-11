import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Space, Select, Checkbox, Popover, message, theme } from 'antd';
import { MinusCircleOutlined, PlusOutlined, BellOutlined, BellFilled } from '@ant-design/icons';
import { useUpdateInventory, useConfigurarRoles, useConfigurarNotificaciones } from '../hooks/useInventory';
import type { NotificacionesConfig } from '../api/inventory.service';

const TIPO_OPTIONS = [
  { value: 'string',  label: 'Texto' },
  { value: 'integer', label: 'Entero' },
  { value: 'float',   label: 'Decimal' },
  { value: 'boolean', label: 'Casilla' },
  { value: 'date',    label: 'Fecha' },
];

// Espejo del Registry del backend (app/tenant/roles_atributos.py): mismos
// roles, mismos tipos permitidos. Agregar un rol acá y allá es el único
// cambio necesario para soportar uno nuevo — ni este componente ni el
// backend necesitan lógica condicional por rol.
const ROLES_CONFIG: { key: string; label: string; tiposPermitidos: string[] }[] = [
  { key: 'volumen_unitario', label: 'Volumen unitario (para calcular el volumen total ocupado)', tiposPermitidos: ['integer', 'float'] },
  { key: 'fecha_reposicion', label: 'Fecha de reposición', tiposPermitidos: ['date'] },
  { key: 'proveedor',        label: 'Proveedor',           tiposPermitidos: ['string'] },
];

interface AtributoNotificacionFormValue {
  recordatorio_dias?: number | null;
  minimo?: number | null;
  maximo?: number | null;
}

interface AtributoFormValue {
  nombre?: string;
  tipo?: string;
  notificacion?: AtributoNotificacionFormValue;
}

// Tipos de atributo que admiten configurar una notificación — string/boolean
// no tienen semántica de "vencimiento" ni de "rango", mismo criterio que ya
// usa el filtro de items (solo integer/float/date son filtrables por rango).
const TIPOS_NOTIFICABLES = new Set(['date', 'integer', 'float']);

const tieneNotificacionCargada = (tipo: string | undefined, notif: AtributoNotificacionFormValue | undefined): boolean => {
  if (!notif) return false;
  if (tipo === 'date') return notif.recordatorio_dias !== undefined && notif.recordatorio_dias !== null;
  return notif.minimo !== undefined && notif.minimo !== null || notif.maximo !== undefined && notif.maximo !== null;
};

interface ModalEditInventoryProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryId: number;
  currentName: string;
  currentAtributos: Record<string, string>;
  currentRolesAtributos?: Record<string, string>;
  currentFotosHabilitadas?: boolean;
  currentNotificacionesConfig?: NotificacionesConfig;
}

export const ModalEditInventory: React.FC<ModalEditInventoryProps> = ({
  isOpen,
  onClose,
  inventoryId,
  currentName,
  currentAtributos = {},
  currentRolesAtributos = {},
  currentFotosHabilitadas = false,
  currentNotificacionesConfig = {},
}) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const { mutate: updateInventory, isPending } = useUpdateInventory();
  const { mutate: configurarRoles, isPending: isPendingRoles } = useConfigurarRoles();
  const { mutate: configurarNotificaciones, isPending: isPendingNotificaciones } = useConfigurarNotificaciones();

  // Se re-renderiza cada vez que se agrega/quita/renombra/cambia el tipo de
  // un atributo en el Form.List de abajo — así los Select de roles siempre
  // ofrecen, en vivo, los atributos que existen EN ESTE MOMENTO del form
  // (incluidos los que el usuario acaba de agregar sin guardar todavía).
  const atributosWatch: AtributoFormValue[] = Form.useWatch('atributos', form) || [];

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        nombre: currentName,
        atributos: Object.entries(currentAtributos).map(([nombre, tipo]) => {
          const notifCfg = currentNotificacionesConfig.atributos?.[nombre];
          const notificacion: AtributoNotificacionFormValue | undefined = notifCfg
            ? notifCfg.tipo === 'fecha'
              ? { recordatorio_dias: notifCfg.recordatorio_dias }
              : { minimo: notifCfg.minimo, maximo: notifCfg.maximo }
            : undefined;
          return { nombre, tipo, isNew: false, notificacion };
        }),
        roles: currentRolesAtributos,
        fotos_habilitadas: currentFotosHabilitadas,
        cantidad_notificacion: currentNotificacionesConfig.cantidad,
      });
    }
  }, [isOpen, currentName, currentAtributos, currentRolesAtributos, currentFotosHabilitadas, currentNotificacionesConfig, form]);

  const makeDefaultValidator = (fieldName: number) => ({
    validator(_: unknown, value: string) {
      if (!value) return Promise.resolve();
      const tipo: string = form.getFieldValue(['atributos', fieldName, 'tipo']);
      switch (tipo) {
        case 'integer':
          return /^-?\d+$/.test(value)
            ? Promise.resolve()
            : Promise.reject(new Error('Debe ser un número entero'));
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
      const notificacionesAtributos: NonNullable<NotificacionesConfig['atributos']> = {};

      if (values.atributos) {
        values.atributos.forEach((attr: AtributoFormValue & { default?: string }) => {
          if (!attr?.nombre) return;
          atributosFormateados[attr.nombre] = attr.tipo!;
          if (attr.default) defaults[attr.nombre] = attr.default;

          // Si el usuario cambió el tipo del atributo (ej. de Entero a
          // Texto) dejando minimo/maximo cargados de cuando era numérico,
          // esos valores residuales ya no aplican — TIPOS_NOTIFICABLES
          // filtra por el tipo ACTUAL, no por lo que haya en 'notificacion'.
          if (!attr.tipo || !TIPOS_NOTIFICABLES.has(attr.tipo)) return;
          if (!tieneNotificacionCargada(attr.tipo, attr.notificacion)) return;
          if (attr.tipo === 'date') {
            notificacionesAtributos[attr.nombre] = {
              tipo: 'fecha',
              recordatorio_dias: attr.notificacion!.recordatorio_dias!,
            };
          } else {
            notificacionesAtributos[attr.nombre] = {
              tipo: 'numero',
              minimo: attr.notificacion?.minimo ?? undefined,
              maximo: attr.notificacion?.maximo ?? undefined,
            };
          }
        });
      }

      const notificacionesConfig: NotificacionesConfig = {};
      if (Object.keys(notificacionesAtributos).length > 0) notificacionesConfig.atributos = notificacionesAtributos;
      const cantidadNotif = values.cantidad_notificacion;
      if (cantidadNotif && (cantidadNotif.minimo != null || cantidadNotif.maximo != null)) {
        notificacionesConfig.cantidad = { minimo: cantidadNotif.minimo ?? undefined, maximo: cantidadNotif.maximo ?? undefined };
      }

      const payload: { nombre: string; atributos: Record<string, string>; defaults?: Record<string, unknown>; fotos_habilitadas: boolean } = {
        nombre: values.nombre,
        atributos: atributosFormateados,
        fotos_habilitadas: Boolean(values.fotos_habilitadas),
      };
      if (Object.keys(defaults).length > 0) payload.defaults = defaults;

      // roles_atributos es un reemplazo completo (mismo criterio que
      // "atributos" acá arriba): se manda el estado completo del form,
      // descartando los roles que el usuario dejó sin asignar (allowClear).
      const rolesAtributos: Record<string, string> = {};
      if (values.roles) {
        Object.entries(values.roles as Record<string, string | undefined>).forEach(([rol, atributo]) => {
          if (atributo) rolesAtributos[rol] = atributo;
        });
      }

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
                  // Notificaciones también se configuran DESPUÉS de que los
                  // atributos ya se guardaron, mismo motivo que roles: si el
                  // usuario le puso una campana a un atributo que recién
                  // está agregando, el backend todavía no lo conoce hasta
                  // que el PUT de arriba terminó.
                  configurarNotificaciones(
                    { id: inventoryId, notificaciones_config: notificacionesConfig },
                    {
                      onSuccess: () => {
                        message.success('Inventario, atributos, roles y notificaciones actualizados');
                        form.resetFields();
                        onClose();
                      },
                      onError: (error) => {
                        console.error(error);
                        message.error('Los atributos y roles se guardaron, pero falló la configuración de notificaciones');
                      },
                    }
                  );
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
    }).catch(console.log);
  };

  return (
    <Modal
      title="Editar Inventario y Atributos"
      open={isOpen}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending || isPendingRoles || isPendingNotificaciones}
      okText="Guardar Cambios"
      cancelText="Cancelar"
      destroyOnClose
      width={640}
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
                  const tipoActual: string | undefined = atributosWatch[field.name]?.tipo;
                  const notifActual = atributosWatch[field.name]?.notificacion;
                  const puedeNotificar = tipoActual !== undefined && TIPOS_NOTIFICABLES.has(tipoActual);
                  const notificacionCargada = tieneNotificacionCargada(tipoActual, notifActual);
                  return (
                    // La fila se parte en dos líneas cuando es un atributo nuevo (isNew):
                    // nombre+tipo+campana+borrar arriba, "Default" solo abajo. Antes los 5
                    // elementos competían por el mismo renglón y dependían de que el
                    // flexWrap del contenedor decidiera cortar en el lugar justo — con
                    // atributos existentes (sin el campo Default) alcanza con una sola
                    // línea, así que ahí no cambia nada.
                    <div key={field.key} style={{ marginBottom: 8 }}>
                    <Space style={{ display: 'flex', flexWrap: 'wrap', rowGap: 8 }} align="baseline">
                      <Form.Item
                        name={[field.name, 'nombre']}
                        rules={[{ required: true, message: 'El nombre no puede estar vacío' }]}
                        style={{ margin: 0 }}
                      >
                        <Input placeholder="Ej: Marca, Tamaño" style={{ width: '150px' }} />
                      </Form.Item>

                      <Form.Item
                        name={[field.name, 'tipo']}
                        rules={[{ required: true, message: 'Elegí un tipo' }]}
                        style={{ margin: 0 }}
                      >
                        <Select
                          placeholder="Tipo"
                          style={{ width: '110px' }}
                          options={TIPO_OPTIONS}
                        />
                      </Form.Item>

                      {puedeNotificar && (
                        <Popover
                          trigger="click"
                          title="Notificarme cuando..."
                          forceRender
                          content={
                            <div style={{ width: 240 }}>
                              {tipoActual === 'date' ? (
                                <>
                                  {/* El checkbox ES la habilitación: tildado = el
                                      inventario notifica este atributo (arranca en
                                      0 días); destildado limpia el campo → el
                                      atributo no genera notificaciones. */}
                                  <Checkbox
                                    checked={notifActual?.recordatorio_dias != null}
                                    onChange={(e) => {
                                      form.setFieldValue(
                                        ['atributos', field.name, 'notificacion', 'recordatorio_dias'],
                                        e.target.checked ? 0 : undefined
                                      );
                                    }}
                                    style={{ marginBottom: notifActual?.recordatorio_dias != null ? 8 : 0 }}
                                  >
                                    Avisar cuando llegue esta fecha
                                  </Checkbox>
                                  {notifActual?.recordatorio_dias != null && (
                                    <Form.Item
                                      name={[field.name, 'notificacion', 'recordatorio_dias']}
                                      label="¿Con cuántos días de anticipación?"
                                      style={{ marginBottom: 0 }}
                                      tooltip="También avisa apenas se cumple la fecha, sin necesidad de configurar nada más. 0 = avisar recién el mismo día."
                                    >
                                      <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Form.Item name={[field.name, 'notificacion', 'minimo']} label="Mínimo" style={{ marginBottom: 8 }}>
                                    <InputNumber style={{ width: '100%' }} placeholder="Sin mínimo" />
                                  </Form.Item>
                                  <Form.Item name={[field.name, 'notificacion', 'maximo']} label="Máximo" style={{ marginBottom: 0 }}>
                                    <InputNumber style={{ width: '100%' }} placeholder="Sin máximo" />
                                  </Form.Item>
                                </>
                              )}
                            </div>
                          }
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={notificacionCargada ? <BellFilled style={{ color: token.colorPrimary }} /> : <BellOutlined />}
                          />
                        </Popover>
                      )}

                      <MinusCircleOutlined
                        style={{ color: 'red', fontSize: '18px' }}
                        onClick={() => remove(field.name)}
                      />
                    </Space>

                    {isNew && (
                      <Form.Item
                        name={[field.name, 'default']}
                        rules={[makeDefaultValidator(field.name)]}
                        style={{ margin: '4px 0 0' }}
                      >
                        <Input placeholder="Default (opcional)" style={{ width: '140px' }} />
                      </Form.Item>
                    )}
                    </div>
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

        <div style={{
          padding:      '16px',
          background:   token.colorFillAlter,
          borderRadius: token.borderRadiusLG,
          border:       `1px solid ${token.colorBorderSecondary}`,
          marginTop:    16,
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 4, color: token.colorText }}>
            <BellOutlined /> Notificación de stock (opcional)
          </h4>
          <p style={{ fontSize: '12px', color: token.colorTextTertiary, marginBottom: 16 }}>
            Avisa cuando la Cantidad de un ítem de este inventario salga de este rango.
          </p>
          <Space>
            <Form.Item name={['cantidad_notificacion', 'minimo']} label="Mínimo" style={{ marginBottom: 0 }}>
              <InputNumber min={0} placeholder="Sin mínimo" />
            </Form.Item>
            <Form.Item name={['cantidad_notificacion', 'maximo']} label="Máximo" style={{ marginBottom: 0 }}>
              <InputNumber min={0} placeholder="Sin máximo" />
            </Form.Item>
          </Space>
        </div>

      </Form>
    </Modal>
  );
};
