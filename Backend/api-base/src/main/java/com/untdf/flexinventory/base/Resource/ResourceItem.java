package com.untdf.flexinventory.base.Resource;

import com.untdf.flexinventory.base.Service.ServiceItem;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableItem;
import com.untdf.flexinventory.base.Transferable.TransferableItemCreate;
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
@RequestMapping("/item")
@CrossOrigin("*")
@Tag(name = "item Endpoint.", description = "Operations related to item management - CRUD.")

public class ResourceItem {

    @Autowired
    ServiceItem service;

    // DOCUMENTATION API
    @Operation(summary = "Creates an Item")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Item created successfully.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableItemCreate.class))
            ),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */)
    })

    // CREATES ITEM BY ID AND BODY
    @PostMapping(value = "create/")
    public ResponseEntity<TransferableItem> createItem(@RequestBody TransferableItemCreate transferableItem){ // recibe un transferible item create
        // se pasan los datos del transferibleItem al transferable
        TransferableItem transferable = service.createItem(transferableItem);
        // convierte el transferable y lo retorna al cliente
        return ResponseEntity.status(HttpStatus.CREATED).body(transferable);
    }

    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Deletes an Item by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Item deleted successfully."),
            @ApiResponse(
                    responseCode = "404",
                    description = "The item was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })
    //--------------------------| DELETE Item BY ID |--------------------------
    @DeleteMapping(value = "{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable("id") Integer id){
        service.deleteItemById(id);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Gets all item in the database.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "items retrieved successfully.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableItem.class))),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })
    //--------------------------| GET ALL Item |--------------------------
    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableItem>> getAllItem() {
        return ResponseEntity.ok(service.getAllItem());
    }

    // GET ITEM BY ID
    @GetMapping(value = "{id}")
    public ResponseEntity<TransferableItemCreate> getItem(@PathVariable("id") Integer id){
        return ResponseEntity.ok(service.getItemById(id));
    }

}
