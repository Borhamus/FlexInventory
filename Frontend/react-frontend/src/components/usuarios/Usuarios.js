import axios from "axios";
import UserService from "../../services/UserService";

// Componente Contenedor
function Container_de_Usuarios({ children }) {
  return <div className="Container_de_Usuarios">{children}</div>;
}

// Componente título
function TitleBlock({ text }) {
  return <div className="registro-title">{text}</div>;
}

// Componente Fila
function Fila_de_Usuario({ usuario }) {
  return (
    <tr className="fila-de-usuario">
      <td className="celda-icono">👤</td>
      <td>{usuario.nombre}</td>
      <td>{usuario.contacto}</td>
      <td>{usuario.estado}</td>
      <td>{usuario.rol}</td>
      <td>{usuario.permisos}</td>
    </tr>
  );
}

// Componente Tabla
function Tabla_de_Usuarios({ usuarios }) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla-de-usuarios">
        <thead>
          <tr>
            <th></th>
            <th>Nombre</th>
            <th>Contacto</th>
            <th>Estado</th>
            <th>Rol</th>
            <th>Permisos</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario, index) => (
            <Fila_de_Usuario key={index} usuario={usuario} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Componente de botones
function Botones_de_Usuario() {
  return (
    <div className="contenedor-botones-usuario">
      <button className="boton-usuario">Crear Usuario</button>
      <button className="boton-usuario">Eliminar Usuario</button>
      <button className="boton-usuario">Crear Rol</button>
      <button className="boton-usuario">Ver Usuario</button>
    </div>
  );
}


// Componente principal de Usuarios
function Usuarios() {

    //UserService.getAllUser(); //Incompleto
    
  return (
    <Container_de_Usuarios>
      <TitleBlock text="Todos los Usuarios:" />
      
      <Botones_de_Usuario />
    </Container_de_Usuarios>
  );
}

export default Usuarios;