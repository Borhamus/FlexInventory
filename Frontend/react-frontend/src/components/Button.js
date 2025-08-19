import React from "react";
import "../styles/Button.css";

function Button({ type = "default", color = "primary", name, icon, onClick }) {
  
  // Definimos tipos de botones
  const buttonTypes = {
    default: { height: "6vh", width: "15vw", padding: "0 16px", borderRadius: "var(--border-radius-button)"},
    
    "icon-button": { height: "6vh", width: "4vw", borderRadius: "var(--border-radius-button)" },
    
    tab: { height: "6vh", padding: "0 24px", borderRadius: "0px" },
  };

  // 🔹 Definimos colores (ejemplo inspirado en Material You)
  const buttonColors = {
    primary: { background: "var(--md-sys-color-primary)", color: "var(--md-sys-color-on-primary)" },
    "primary-container": { background: "#BB86FC", color: "#000000" },
    secondary: { background: "var(--md-sys-color-secondary)", color: "#000000" },
    "secondary-container": { background: "#018786", color: "#FFFFFF" },
    tertiary: { background: "#FF5722", color: "#FFFFFF" },
    "tertiary-container": { background: "#FFCCBC", color: "#000000" },
    // inversos (ejemplo)
    "primary-inverse": { background: "var(--md-sys-color-inverse-primary)", color: "var(--md-sys-color-primary)" },
    "secondary-inverse": { background: "var(--md-sys-color-secondary)", color: "var(--md-sys-color-primary)" },
  };

  // Obtenemos el estilo segun props
  const typeStyle = buttonTypes[type] || buttonTypes.default;
  const colorStyle = buttonColors[color] || buttonColors.primary;

  return (
    <button
      className="botonGenerico"
      style={{
        ...typeStyle,
        ...colorStyle,
      }}
      onClick={onClick}
    >
      {icon && (
        <div className="botonGenericoIcon">
          <i className={icon}></i>
        </div>
      )}
      {name && <div className="botonGenericoName">{name}</div>}
    </button>
  );
}

export default Button;
