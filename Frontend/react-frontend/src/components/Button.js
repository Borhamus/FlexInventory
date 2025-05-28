import React from "react";
import "../styles/Button.css"

function Button(props) {
  return (
    <button className = "botonGenerico" style={{background: props.bgColor} } onClick={props.click}>
      <div className="botonGenericoIcon">
        <i className={props.icon}></i>
      </div>
      <div className="botonGenericoName">
        {props.name}
      </div>
    </button>
  );
}

export default Button;