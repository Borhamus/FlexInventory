package com.untdf.flexinventory.base.Resource;

import com.untdf.flexinventory.base.Service.ServiceInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryCreate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inventory")
@CrossOrigin("*")
public class ResourceInventory {

    @Autowired
    ServiceInventory service;

    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableInventory>> getAllInventories(){
        return ResponseEntity.ok(service.getAllInventories());
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<TransferableInventory> getInventory(@PathVariable Integer id){
        return ResponseEntity.ok(service.getInventoryById(id));
    }

    @DeleteMapping(value = "{id}")
    public void deleteInventory(@PathVariable Integer id){
        service.deleteInventoryById(id);
    }

    @PutMapping(value = "/edit")
    public TransferableInventory updateInventoy(@RequestBody TransferableInventory transferableInventory){
        return service.editInventory(transferableInventory);
    }

    @Operation(summary = "Creates an Inventory")
    @ApiResponse(responseCode = "201", description = "Inventory created successfully.")
    @PostMapping(value = "create/")
    public ResponseEntity<TransferableInventory> createInventory(@RequestBody TransferableInventoryCreate transferableInventoryCreate){
        TransferableInventory transferable = service.createInventory(transferableInventoryCreate);
        return ResponseEntity.status(HttpStatus.CREATED).body(transferable);
    }

}
