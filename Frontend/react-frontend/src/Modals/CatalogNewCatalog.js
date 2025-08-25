const CatalogNewCatalog = () => {

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