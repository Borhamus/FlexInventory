function Container({ children }) {
  return <div className="registro-container">{children}</div>;
}

// Componente título
function TitleBlock({ text }) {
  return <div className="registro-title">{text}</div>;
}

// Campo de entrada reutilizable
function InputField({ placeholder, type = "text" }) {
  return <input type={type} placeholder={placeholder} className="registro-input" />;
}

// Botón de envío
function SubmitButton({ text }) {
  return (
    <button className="registro-button">
      <span role="img" aria-label="user">👤</span> {text}
    </button>
  );
}

// Componente principal Registro
function Registro() {
  return (
    <Container>
      <TitleBlock text="Registro de Usuario" />
      <InputField placeholder="Nombre y Apellido" />
      <InputField placeholder="Nombre de Usuario" />
      <InputField placeholder="Contraseña" type="password" />
      <InputField placeholder="Confirmar Contraseña" type="password" />
      <InputField placeholder="Correo Electrónico" type="email" />
      <SubmitButton text="Registrarse" />
    </Container>
  );
}

export default Registro;