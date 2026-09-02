import React from 'react';
import { Modal, Form, Input, Button, Space, Select, Checkbox, theme } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useCreateInventory, useConfigurarRoles } from '../hooks/useInventory';

// Nombre fijo del atributo que arma el checkbox de vencimiento. Si el
// usuario ya definió a mano un atributo con este mismo nombre, se
// sobrescribe como "date" — es la intención explícita de tildar la casilla.
const ATRIBUTO_VENCIMIENTO = 'Vencimiento';

const TIPO_OPTIONS = [
  { value: 'string',  label: 'Texto' },
  { value: 'integer', label: 'Número entero' },
  { value: 'float',   label: 'Número decimal' },
  { value: 'boolean', label: 'Booleano' },
  { value: 'date',    label: 'Fecha' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ModalAddInventory: React.FC<Props> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();

  const { mutate: createInventory, isPending } = useCreateInventory();
  const { mutate: configurarRoles, isPending: isPendingRoles } = useConfigurarRoles();

  const handleSubmit = () => {
    form.validateFields().then((values) => {

      const atributosFormateados: Record<string, string> = {};
      if (values.atributos_dinamicos) {
        values.atributos_dinamicos.forEach((item: { llave: string; tipo: string }) => {
          if (item?.llave) {
            atributosFormateados[item.llave] = item.tipo;
          }
        });
      }

      // El checkbox agrega el atributo de vencimiento y, después de crear el
      // inventario, le asigna el rol fecha_reposicion — es un atajo de UI
      // sobre dos pasos que ya existían por separado (agregar atributo +
      // "Roles Especiales" en Editar Inventario), no un concepto nuevo.
      const tieneVencimiento = Boolean(values.tiene_vencimiento);
      if (tieneVencimiento) {
        atributosFormateados[ATRIBUTO_VENCIMIENTO] = 'date';
      }

      const payloadFinal = {
        nombre:      values.nombre,
        descripcion: values.descripcion,
        atributos:   atributosFormateados,
        fotos_habilitadas: Boolean(values.fotos_habilitadas),
      };

      const finalizar = () => {
        form.resetFields();
        onClose();
      };

      createInventory(payloadFinal, {
        onSuccess: (nuevoInventario) => {
          if (tieneVencimiento && nuevoInventario?.id) {
            configurarRoles(
              { id: nuevoInventario.id, roles_atributos: { fecha_reposicion: ATRIBUTO_VENCIMIENTO } },
              {
                onSuccess: finalizar,
                onError: (error) => {
                  // El inventario ya se creó — solo falló el paso extra de
                  // asignar el rol. Se puede configurar a mano después desde
                  // "Roles Especiales" en Editar Inventario.
                  console.error('El inventario se creó, pero falló configurar el rol de vencimiento', error);
                  finalizar();
                },
              }
            );
          } else {
            finalizar();
          }
        },
        onError: (error) => {
          console.error("Falló el POST", error);
        }
      });
    }).catch((error) => {
      console.log("Validación fallida", error);
    });
  };

  return (
    <Modal
      title="Crear Nuevo Inventario"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText={isPending || isPendingRoles ? "Creando..." : "Crear"}
      cancelText="Cancelar"
      confirmLoading={isPending || isPendingRoles}
      destroyOnClose
    >
      <p style={{ marginBottom: 20, color: token.colorTextSecondary }}>
        Define los detalles del inventario y los atributos base que tendrán sus artículos.
      </p>

      <Form form={form} layout="vertical">
        <Form.Item
          label="Nombre del Inventario"
          name="nombre"
          rules={[{ required: true, message: 'El nombre es obligatorio' }]}
        >
          <Input placeholder="Ej: Depósito Central" size="large" />
        </Form.Item>

        <Form.Item label="Descripción" name="descripcion">
          <Input.TextArea rows={2} placeholder="Detalles opcionales..." />
        </Form.Item>

        <Form.Item name="tiene_vencimiento" valuePropName="checked" style={{ marginBottom: 4 }}>
          <Checkbox>
            Los artículos de este inventario tienen fecha de vencimiento
          </Checkbox>
        </Form.Item>
        <p style={{ fontSize: '12px', color: token.colorTextTertiary, marginTop: 0, marginBottom: 20, paddingLeft: 24 }}>
          Se va a pedir la fecha de vencimiento a cada artículo que cargues, y vas a poder ver desde el inicio cuáles están por vencer o ya vencieron.
        </p>

        <Form.Item name="fotos_habilitadas" valuePropName="checked" style={{ marginBottom: 4 }}>
          <Checkbox>
            Los artículos de este inventario van a tener foto
          </Checkbox>
        </Form.Item>
        <p style={{ fontSize: '12px', color: token.colorTextTertiary, marginTop: 0, marginBottom: 20, paddingLeft: 24 }}>
          Si no lo tildás, no se te va a pedir ni mostrar el campo de foto en los artículos — lo podés cambiar después desde Editar Inventario.
        </p>

        <div style={{
          padding:      '16px',
          background:   token.colorFillAlter,
          borderRadius: token.borderRadiusLG,
          marginBottom: '24px',
          border:       `1px solid ${token.colorBorderSecondary}`,
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 8, color: token.colorText }}>
            Atributos del Inventario
          </h4>
          <p style={{ fontSize: '12px', color: token.colorTextTertiary, marginBottom: 16 }}>
            Definí qué datos se le pedirán a cada artículo (ej: Color, Talle, Material).
          </p>

          <Form.List name="atributos_dinamicos">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'llave']}
                      rules={[{ required: true, message: 'Ingresá el nombre' }]}
                      style={{ margin: 0 }}
                    >
                      <Input
                        placeholder="Nombre (ej: Color)"
                        style={{ width: '220px' }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'tipo']}
                      rules={[{ required: true, message: 'Elegí un tipo' }]}
                      style={{ margin: 0 }}
                    >
                      <Select
                        placeholder="Tipo"
                        style={{ width: '150px' }}
                        options={TIPO_OPTIONS}
                      />
                    </Form.Item>
                    <MinusCircleOutlined
                      onClick={() => remove(name)}
                      style={{ color: token.colorError, marginLeft: '8px' }}
                    />
                  </Space>
                ))}

                <Form.Item style={{ marginBottom: 0, marginTop: fields.length ? 8 : 0 }}>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Agregar Atributo
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>
      </Form>
    </Modal>
  );
};
