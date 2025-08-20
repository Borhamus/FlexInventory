import {useState, useEffect} from "react";
import AttributeService from "../services/AttributeService";
import CatalogService from "../services/CatalogService";

export default function NewCatalog() {

    const [elements, setElements] = useState([]);
    const [selectedAttributes, setSelectedAttributes] = useState([]);

    const [CatalogName, setCatalogName] = useState("");
    const [CatalogDescription, setCatalogDescription] = useState("");
    
    useEffect(() => {
        AttributeService.getAllAttributes()
          .then(data => setElements(data))
          .catch(error => console.error('Error al cargar los atributos:', error));
    }, []);

    const attributes = [
        ...elements.map((elemento) => ({
          label: elemento.name,
          id: elemento.id
        }))
    ]

    const handleCheckboxChange = (event) => {
        const checkedId = Number(event.target.value);
        if (event.target.checked) {
          setSelectedAttributes([...selectedAttributes, checkedId])
        } else {
          setSelectedAttributes(selectedAttributes.filter(id => id !== checkedId))
        }
      }
    
      console.log("Debug - Atributos seleccionados: " + selectedAttributes)
    
      const checkBoxList = (
        attributes.map((a) => (
          <label key={a.id} className='dialog-body--checkbox-list--list--checkbox-item'>
            <input
              type="checkbox"
              // El valor del check es el id del atributo
              value={a.id}
              // Cuando cambia el check se hace...
              onChange={(event) => { handleCheckboxChange(event) }}
            />
            {a.label}
          </label>
        ))
      )
    
      const acceptedList = (
        <ul className='dialog-body--catalog-form--input-container--accepted-list--container-list'>
          {selectedAttributes.map((id) => {
            const attr = attributes.find(a => a.id === id);
            return (
              <li key={id} className='dialog-body--catalog-form--input-container--accepted-list--container-list--item'>
                {attr ? attr.label : "Atributo no encontrado"}
              </li>
            );
          })}
        </ul>
    );

    const handleFormSubmit = async (event) => {
        event.preventDefault(); 
        try {
          const CatalogForm = {
            name: CatalogNameName,
            description: CatalogDescriptionDescription,
            attributesIds: selectedAttributes
          }
          const response = await CatalogService.createCatalog(CatalogForm);
        } catch (error) {
          console.error("Error al crear el Catalogo", error);
        }
      };

    return (
        <div className='dialog-body'>
      <div className='dialog-body--left-container'>
        <div className='dialog-body--checkbox-list--search-bar'>
          <input
            type="text"
            name="attributeSearchBar"
            placeholder="Attribute name..."
            className='dialog-body--checkbox-list--search-bar--input'
          />
        </div>
        <div className='dialog-body--checkbox-list--list'>
          {checkBoxList}
        </div>
        <div className='dialog-body--checkbox-list--new-attribute-btn'>
          <button className='dialog-body--checkbox-list--new-attribute-btn--btn'>
            New Attribute
          </button>
        </div>
      </div>
      <div className='dialog-body--right-container'>
        <form onSubmit={handleFormSubmit} className='dialog-body--Catalog-form'>
          <div className="dialog-body--Catalog-form--input-container">
            <input
              type="text"
              name="CatalogName"
              placeholder="Catalog name..."
              className='dialog-body--Catalog-form--input-container--Catalog-name'
              value={CatalogName}
              onChange={(e) => setCatalogName(e.target.value)}
            />
            <input
              type="text"
              name="CatalogDescription"
              placeholder="Catalog description..."
              className='dialog-body--Catalog-form--input-container--Catalog-description'
              value={CatalogDescription}
              onChange={(e) => setCatalogDescription(e.target.value)}
            />
            <input
              type="date"
              name="CatalogRevisionDate"
              className='dialog-body--Catalog-form--input-container--Catalog-revison-date'
              value={CatalogRevisionDate}
              onChange={(e) => setCatalogRevisionDate(e.target.value)}
            />
          </div>
          <div className="dialog-body--catalog-form--input-container--accepted-list">
            {acceptedList}
          </div>
          <div className='dialog-body--catalog-form--input-container--submit-btn'>
            <input
              type="submit"
              value="Create"
              className="dialog-body--Catalog-form--input-container--submit-btn--btn"
            />
          </div>
        </form>
      </div>
    </div>
    )

}