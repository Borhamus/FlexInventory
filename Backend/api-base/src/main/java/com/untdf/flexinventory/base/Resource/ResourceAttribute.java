package com.untdf.flexinventory.base.Resource;

import com.untdf.flexinventory.base.Service.ServiceAttribute;
import com.untdf.flexinventory.base.Transferable.TransferableAttribute;
import com.untdf.flexinventory.base.Transferable.TransferableAttributeCreate;
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
@RequestMapping("/attribute")
@CrossOrigin("*")
@Tag(name = "Attribute Endpoint", description = "Operations related to attribute management - CRUD ")
public class ResourceAttribute {

    @Autowired
    ServiceAttribute service;

    // ENDPOINT GET TODOS LOS ATRIBUTOS:

    // - OPERACION Y RESPUESTA
    @Operation(summary = "Get all attributes in database")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Attributes retrieved successfully.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableAttribute.class))),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })

    // - OBTENER TODOS LOS ATRIBUTOS
    @GetMapping(value = "/all")
    public ResponseEntity<List<TransferableAttribute>> getAllAttributes() {
        return ResponseEntity.ok(service.getAllAttributes());
    }

    // -------------------------------------------------------------------

    // ENDPOINT GET DE ATRIBUTO:

    // - OPERACION Y RESPUESTAS
    @Operation(summary = "Gets an attribute by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Attribute retrieved successfully.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableAttribute.class))),
            @ApiResponse(
                    responseCode = "404",
                    description = "Attribute was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */)
    })

    // - OBTENER UN ATRIBUTO POR ID
    @GetMapping(value = "{id}")
    public ResponseEntity<TransferableAttribute> getAttribute(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(service.getAttributeById(id));
    }

    // ------------------------------------------------------------------

    // ENDPOINT DELETE DE ATRIBUTO:

    @Operation(summary = "Deletes an attribute by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Attribute deleted successfully."),
            @ApiResponse(
                    responseCode = "404",
                    description = "The attribute was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })

    // ELIMINAR UN ATRIBUTO
    @DeleteMapping(value = "{id}")
    public ResponseEntity<Void> deleteAttribute(@PathVariable("id") Integer id){
        service.deleteAttributeById(id);
        return ResponseEntity.ok().build();
    }

    // ----------------------------------------------------------------------

    // ENDPOINT UPDATE UN ATRIBUTO

    @Operation(summary = "Updates an attribute by id.")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Attribute updated successfully."),
            @ApiResponse(
                    responseCode = "404",
                    description = "The attribute was not found.",
                    content = @Content() /* No content for 404 */),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })

    // ACTUALIZAR UN ATRIBUTO
    @PutMapping(value = "/edit/{id}")
    public ResponseEntity<TransferableAttribute> updateAttribute(@PathVariable("id") Integer id, @RequestBody TransferableAttribute transferableAttribute){
        return ResponseEntity.ok(service.editAttribute(transferableAttribute));
    }

    // ENDPOINT CREATE DE ATRIBUTO

    @Operation(summary = "Creates an Attributr")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Attribute created successfully.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableAttributeCreate.class))
            ),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */)
    })

    // CREAR UN ATRIBUTO
    @PostMapping(value = "create/")
    public ResponseEntity<TransferableAttribute> createAttribute(@RequestBody TransferableAttributeCreate transferableAttributeCreate){
        TransferableAttribute transferable = service.createAttribute(transferableAttributeCreate);
        return ResponseEntity.status(HttpStatus.CREATED).body(transferable);
    }

}