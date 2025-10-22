// src/components/DynamicForm.js
import React from "react";
import "../styles/DynamicForm.css";

function DynamicForm({ fields = [], values, onChange, formDirection = "default" }) {
  const directions = {
    column: { display: "flex", flexDirection: "column" },
    row: { display: "flex", flexDirection: "row", gap: ".7em" },
    "grid-2": { display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".7em" },
    "grid-3": { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".7em" },
    default: { display: "flex", flexDirection: "column"},
  };

  const direction = directions[formDirection] || directions.default;

  return (
    <form className="dynamic-form" style={direction}>
      {fields.map((field, i) => (
        <div key={i} className="dynamic-form--field-container">
          <label className="dynamic-form--field-container--label">{field.label}</label>

          {field.type === "select" ? (
            <select
              name={field.name}
              value={values[field.name] || ""}
              onChange={(e) => onChange(field.name, e.target.value)}
              className="dynamic-form--field-container--input"
            >
              <option value="">Seleccione...</option>
              {field.options?.map((opt, j) => (
                <option key={j} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || "text"}
              name={field.name}
              value={values[field.name] || ""}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.name, e.target.value)}
              className="dynamic-form--field-container--input"
            />
          )}
        </div>
      ))}
    </form>
  );
}

export default DynamicForm;
