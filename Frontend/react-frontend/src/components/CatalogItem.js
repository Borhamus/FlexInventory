import "../styles/CatalogItem.css"

function CatalogItem({image,name,onClick,isSelected}) {
    return (
        <button className={`catalog-item--button ${isSelected ? 'selected' : ''}`} onClick={onClick}> 
            <img src={image}/>
            <span>{name}</span>
        </button>
    );
}

export default CatalogItem;