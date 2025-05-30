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
@Tag(name = "Inventory Endpoint.", description = "Operations related to inventory management - CRUD.")
public class ResourceInventory {

    @Autowired
    ServiceInventory service;

    //--------------------------| GET ALL INVENTORIES |--------------------------
    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Gets all inventories in the database.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventories retrieved successfully.",
                    content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = TransferableInventory.class))),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })
    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableInventory>> getAllInventories(){
        return ResponseEntity.ok(service.getAllInventories());
    }

    //--------------------------| GET INVENTORY BY ID |--------------------------
    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Gets an inventory by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventory retrieved successfully.",
                    content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = TransferableInventory.class))),
            @ApiResponse(
                    responseCode = "404",
                    description = "Inventory was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */)
    })
    @GetMapping(value = "{id}")
    public ResponseEntity<TransferableInventory> getInventory(@PathVariable("id") Integer id){
        return ResponseEntity.ok(service.getInventoryById(id));
    }

    //--------------------------| DELETE INVENTORY BY ID |--------------------------
    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Deletes an inventory by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventory deleted successfully."),
            @ApiResponse(
                    responseCode = "404",
                    description = "The inventory was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })
    @DeleteMapping(value = "{id}")
    public ResponseEntity<Void> deleteInventory(@PathVariable("id") Integer id){
        service.deleteInventoryById(id);
        return ResponseEntity.ok().build();
    }


    //--------------------------| UPDATED INVENTORY BY ID |--------------------------
    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Updates an inventory by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventory updated successfully."),
            @ApiResponse(
                    responseCode = "404",
                    description = "The inventory was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })
    @PutMapping(value = "/{id}")
    public ResponseEntity<TransferableInventory> updateInventoy(@PathVariable("id") Integer id, @RequestBody TransferableInventory transferableInventory){
        return ResponseEntity.ok(service.editInventory(transferableInventory));
    }

    //--------------------------| CREATES INVENTORY BY ID AND BODY |--------------------------
    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Creates an Inventory")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventory created successfully.",
                    content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = TransferableInventoryCreate.class))
            ),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */)
    })
    @PostMapping(value = "/")
    public ResponseEntity<TransferableInventory> createInventory(@RequestBody TransferableInventoryCreate transferableInventoryCreate){
        TransferableInventory transferable = service.createInventory(transferableInventoryCreate);
        return ResponseEntity.status(HttpStatus.CREATED).body(transferable);
    }

}
