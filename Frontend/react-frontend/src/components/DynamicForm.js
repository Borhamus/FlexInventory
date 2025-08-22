// src/components/DynamicForm.js
import React from "react";
import "../styles/DynamicForm.css";

function DynamicForm({ fields = [], values, onChange }) {
  return (
    <form className="">
      {fields.map((field, i) => (
        <div key={i} className="">
          <label className="">{field.label}</label>
          <input
            type={field.type || "text"}
            name={field.name}
            value={values[field.name] || ""}
            onChange={(e) => onChange(field.name, e.target.value)}
            className=" "
          />
        </div>
      ))}
    </form>
  );
}

export default DynamicForm;
