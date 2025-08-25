// src/components/DynamicForm.js
import React from "react";
import "../styles/DynamicForm.css";

function DynamicForm({ fields = [], values, onChange }) {
  return (
    <form className="dynamic-form">
      {fields.map((field, i) => (
        <div key={i} className="dynamic-form--field-container">
          <label className="dynamic-form--field-container--label">{field.label}</label>
          <input
            type={field.type || "text"}
            name={field.name}
            value={values[field.name] || ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.name, e.target.value)}
            className="dynamic-form--field-container--input"
          />
        </div>
      ))}
    </form>
  );
}

export default DynamicForm;
