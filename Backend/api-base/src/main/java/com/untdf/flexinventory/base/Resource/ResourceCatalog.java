package com.untdf.flexinventory.base.Resource;


import com.untdf.flexinventory.base.Transferable.TransferableCatalog;
import com.untdf.flexinventory.base.Transferable.TransferableCatalogCreate;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryCreate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.untdf.flexinventory.base.Service.ServiceCatalog;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController  //para manejar las cosas como tipo json
@RequestMapping("/catalog") //para la url
@CrossOrigin("*")  //indica desde que host se puede acceder a la api
public class ResourceCatalog {

    @Autowired
    ServiceCatalog service;

    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableCatalog>>getAllCatalog(){
        return ResponseEntity.ok(service.getAllCatalog());
    }

    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Gets an Catalog by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Catalog retrieved successfully.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableCatalog.class))),
            @ApiResponse(
                    responseCode = "404",
                    description = "Catalog was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */)
    })
    //--------------------------| GET Catalog BY ID / READ |--------------------------
    @GetMapping(value = "{id}")
    public ResponseEntity<TransferableCatalog> getCatalog(@PathVariable("id") Integer id){
        return ResponseEntity.ok(service.getCatalogById(id));
    }


    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Deletes an Catalog by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Catalog deleted successfully."),
            @ApiResponse(
                    responseCode = "404",
                    description = "The Catalog was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })
    //--------------------------| DELETE Catalog BY ID |--------------------------
    @DeleteMapping(value = "{id}")
    public ResponseEntity<Void> deleteCatalog(@PathVariable("id") Integer id){
        service.deleteCatalogById(id);
        return ResponseEntity.ok().build();
    }

    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Updates an Catalog by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Catalog updated successfully."),
            @ApiResponse(
                    responseCode = "404",
                    description = "The Catalog was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })
    //--------------------------| UPDATED Catalog BY ID |--------------------------
    @PutMapping(value = "/edit/{id}")
    public ResponseEntity<TransferableCatalog> updateCatalog(@PathVariable("id") Integer id, @RequestBody TransferableCatalog transferableCatalog){
        return ResponseEntity.ok(service.editCatalog(transferableCatalog));
    }

    //--------------------------| Documentación API |--------------------------
    @Operation(summary = "Creates an Catalog")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Catalog created successfully.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableCatalogCreate.class))
            ),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */)
    })
    //--------------------------| CREATES Catalog BY ID AND BODY |--------------------------
    @PostMapping(value = "create/")
    public ResponseEntity<TransferableCatalog> createCatalog(@RequestBody TransferableCatalogCreate transferableCatalogCreate){
        TransferableCatalog transferable = service.createCatalog(transferableCatalogCreate);
        return ResponseEntity.status(HttpStatus.CREATED).body(transferable);
    }
}
