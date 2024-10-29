package com.untdf.flexinventory.base.Resource;

import com.untdf.flexinventory.base.Service.ServiceInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryCreate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inventory")
@CrossOrigin("*")
@Tag(name = "Inventory Endpoint.", description = "Operations related to inventory management - CRUD")
public class ResourceInventory {

    @Autowired
    ServiceInventory service;

    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Gets all inventories in the database.")
    @ApiResponse(
            responseCode = "200", description = "Inventories retrieved successfully.",
            content = @Content(mediaType = "application/json",
            schema = @Schema(implementation = TransferableInventory.class)))
    //--------------------------| GET ALL |--------------------------
    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableInventory>> getAllInventories(){
        return ResponseEntity.ok(service.getAllInventories());
    }

    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Gets an inventory by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200", description = "Inventory retrieved successfully",
                    content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = TransferableInventory.class))),
            @ApiResponse(responseCode = "404", description = "Inventory was not found")
    })
    //--------------------------| GET BY ID |--------------------------
    @GetMapping(value = "{id}")
    public ResponseEntity<TransferableInventory> getInventory(@PathVariable("id") Integer id){
        return ResponseEntity.ok(service.getInventoryById(id));
    }

    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Deletes an inventory by id.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Inventory deleted successfully"),
            @ApiResponse(responseCode = "404", description = "The inventory was not found.")
    })
    //--------------------------| DELETE BY ID |--------------------------
    @DeleteMapping(value = "{id}")
    public void deleteInventory(@PathVariable("id") Integer id){
        service.deleteInventoryById(id);
    }

    @PutMapping(value = "/edit/{id}")
    public TransferableInventory updateInventoy(@PathVariable("id") Integer id, @RequestBody TransferableInventory transferableInventory){
        return service.editInventory(transferableInventory);
    }

    @Operation(summary = "Creates an Inventory")
    @ApiResponse(responseCode = "201", description = "Inventory created successfully.")
    @ApiResponse(responseCode = "404", description = "The inventory was not found or the inventory doesn't exist.")
    @PostMapping(value = "create/")
    public ResponseEntity<TransferableInventory> createInventory(@RequestBody TransferableInventoryCreate transferableInventoryCreate){
        TransferableInventory transferable = service.createInventory(transferableInventoryCreate);
        return ResponseEntity.status(HttpStatus.CREATED).body(transferable);
    }

}
