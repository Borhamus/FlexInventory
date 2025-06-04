
import 'primeicons/primeicons.css';
        
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
      <i className="pi pi-user"></i> {text}
    </button>
  );
}

// Componente principal Registro
function Registro() {
  return (
    <Container>
      <TitleBlock text="Registro de Usuario" />
      <InputField placeholder="Correo Electrónico" type="email" />
      <InputField placeholder="Contraseña" type="password" />
      <InputField placeholder="Confirmar Contraseña" type="password" />
      <SubmitButton text="Registrarse" />
    </Container>
  );
}

export default Registro;