package com.untdf.flexinventory.base.Documentation;

import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryCreate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Inventory Endpoint.", description = "Operaciones relacionadas con los Inventarios - CRUD.")
@RequestMapping("/inventory")
@CrossOrigin("*")
public interface InventoryApiDocumentacion {

    //--------------------------| OBTENER TODOS LOS INVENTARIOS |--------------------------
    @Operation(summary = "Obtiene todos los inventarios del Sistema.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventarios obtenidos.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableInventory.class))),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content())
    })
    ResponseEntity<List<TransferableInventory>> getAllInventories();


    //--------------------------| OBTENER INVENTARIO POR ID |--------------------------
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
                    content = @Content()),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content())
    })

    ResponseEntity<TransferableInventory> getInventory(@PathVariable("id") Integer id);


    //--------------------------| ELIMINAR INVENTARIO POR ID |--------------------------
    @Operation(summary = "Deletes an inventory by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventory deleted successfully."),
            @ApiResponse(
                    responseCode = "404",
                    description = "The inventory was not found.",
                    content = @Content()),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content())
    })

    ResponseEntity<Void> deleteInventory(@PathVariable("id") Integer id);


    //--------------------------| ACTUALIZAR INVENTARIO |--------------------------
    @Operation(summary = "Updates an inventory by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Inventory updated successfully."),
            @ApiResponse(
                    responseCode = "404",
                    description = "The inventory was not found.",
                    content = @Content()),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content())
    })

    ResponseEntity<TransferableInventory> updateInventoy(
            @PathVariable("id") Integer id,
            @RequestBody TransferableInventory transferableInventory
    );


    //--------------------------| CREAR INVENTARIO |--------------------------
    @Operation(summary = "Creates an Inventory")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "Inventory created successfully.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableInventoryCreate.class))),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content())
    })

    ResponseEntity<TransferableInventory> createInventory(
            @RequestBody TransferableInventoryCreate transferableInventoryCreate
    );
}
