package com.untdf.flexinventory.base.Resource;


import com.untdf.flexinventory.base.Service.ServiceInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryCreate;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryEdit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.untdf.flexinventory.base.Documentation.InventoryApiDocumentacion;

import java.util.List;

@RestController
public class ResourceInventory implements InventoryApiDocumentacion {

    @Autowired
    private ServiceInventory service;

    // -----------------------------------------------------------------------
    // -------------------| Obtiene todos los inventarios |-------------------
    // -----------------------------------------------------------------------
    @Override
    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableInventory>> getAllInventories() {
        return ResponseEntity.ok(service.getAllInventories());
    }

    // -----------------------------------------------------------------------
    // -------------------| Obtiene un inventario por ID |--------------------
    // -----------------------------------------------------------------------
    @Override
    @GetMapping(value = "{id}")
    public ResponseEntity<TransferableInventory> getInventory(Integer id) {
        return ResponseEntity.ok(service.getInventoryById(id));
    }

    // -----------------------------------------------------------------------
    // --------------------| Borra un inventario por ID |---------------------
    // -----------------------------------------------------------------------
    @Override
    @DeleteMapping(value = "{id}")
    public ResponseEntity<Void> deleteInventory(Integer id) {
        service.deleteInventoryById(id);
        return ResponseEntity.ok().build();
    }

    // -----------------------------------------------------------------------
    // ------------------| Actualiza un inventario por ID |-------------------
    // -----------------------------------------------------------------------
    @Override
    @PutMapping(value = "/{id}")
    public ResponseEntity<TransferableInventory> updateInventoy(Integer id, TransferableInventoryEdit transferableInventory) {
        return ResponseEntity.ok(service.editInventory(transferableInventory));
    }

    // -----------------------------------------------------------------------
    // -----------------------| Crea un inventario |--------------------------
    // -----------------------------------------------------------------------
    @Override
    @PostMapping(value = "/")
    public ResponseEntity<TransferableInventory> createInventory(TransferableInventoryCreate transferableInventoryCreate) {
        TransferableInventory transferable = service.createInventory(transferableInventoryCreate);
        return ResponseEntity.status(HttpStatus.CREATED).body(transferable);
    }
}
