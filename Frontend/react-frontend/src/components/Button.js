import React from "react";
import "../styles/Button.css";

function Button({ type = "default", size = "default", color = "primary", name, icon, onClick }) {

  // Definimos tipos de botones
  const buttonTypes = {
    "default": { padding: "1.4em", borderRadius: "var(--border-radius-button)" },

    "icon-button": {borderRadius: "var(--border-radius-icon-button)" },

    "tab": {borderRadius: "0px" },
  };

  const buttonSizesByType = {
    "icon-button": {
      default: { height: "6vh", width: "4vw", iconSize: "1em" },
      small: { minHeight: "4vh", minWidth: "2.5vw", iconSize: "0.9em" },
      medium: { height: "6vh", width: "4vw", iconSize: "1.2em"},
      large: { height: "8vh", width: "5vw", iconSize: "1.35em" },
    },
    "tab": {
      default: { height: "6vh", width: "15vw" },
      small: { height: "4vh", width: "8vw" },
      medium: { height: "6vh", width: "12vw" },
      large: { height: "8vh", width: "17vw" },
    },
    "default": {
      default: { height: "6vh", width: "15vw", iconSize: "1.2em" },
      small: { height: "4vh", width: "8vw" },
      medium: { height: "6vh", width: "12vw" },
      large: { height: "8vh", width: "17vw" },
    }
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

  const buttonSize =
    (buttonSizesByType[type] && buttonSizesByType[type][size]) ||
    buttonSizesByType.default[size] ||
    buttonSizesByType.default.default;

  return (
    <button
      className="botonGenerico"
      style={{
        ...typeStyle,
        ...colorStyle,
        ...buttonSize,
      }}
      onClick={onClick}
    >
      {icon && (
        <div className="botonGenericoIcon">
          <i className={icon} style={{fontSize: buttonSize.iconSize}}></i>
        </div>
      )}
      {name && <div className="botonGenericoName">{name}</div>}
    </button>
  );
}

export default Button;
