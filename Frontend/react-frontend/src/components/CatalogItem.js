import React from "react";
import "../styles/CatalogItem.css"

function CatalogItem({image,name,onClick}) {
    return (
        <button className="catalog-item--button"> 
            <img scr={image}/>
            <span>{name}</span>
            {/* onClick = {el pop up de la modal xd} */}
        </button>
    );
}

export default CatalogItem;