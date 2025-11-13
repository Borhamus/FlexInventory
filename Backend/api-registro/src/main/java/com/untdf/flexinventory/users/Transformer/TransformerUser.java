package com.untdf.flexinventory.users.Transformer;

import com.untdf.flexinventory.users.Model.User;
import com.untdf.flexinventory.users.Transferable.TransferableGetUser;
import com.untdf.flexinventory.users.Transferable.TransferableUser;
import org.mapstruct.InheritInverseConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TransformerUser {

    TransferableUser toDTO (User user);

    TransferableGetUser toDTOGetUser (User user);

    List<TransferableGetUser> toDTOGetAllUser (List<User> user);

    @InheritInverseConfiguration
    User toEntity (TransferableUser transferableUser);
}
