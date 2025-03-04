import { print, readFile } from "@amplication/code-gen-utils";
import { builders, namedTypes } from "ast-types";
import {
  CreateSeedParams,
  Entity,
  EntityField,
  EnumDataType,
  EventNames,
  Module,
  types,
} from "@amplication/code-gen-types";

import {
  addImports,
  awaitExpression,
  importContainedIdentifiers,
  interpolate,
  memberExpression,
  removeTSVariableDeclares,
} from "../../util/ast";
import { getDTONameToPath } from "../resource/create-dtos";
import { getImportableDTOs } from "../resource/dto/create-dto-module";
import { createEnumMemberName } from "../resource/dto/create-enum-dto";
import { createEnumName } from "../prisma/create-prisma-schema-fields";
import DsgContext from "../../dsg-context";
import pluginWrapper from "../../plugin-wrapper";
import { USER_AUTH_FIELDS } from "../user-entity/user-entity";

type SeedProperties = {
  userNameFieldName: string;
  userPasswordFieldName: string;
  userRolesFieldName: string;
};

const seedTemplatePath = require.resolve("./seed.template.ts");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";
const ADMIN_ROLE = "user";
const DEFAULT_ADDRESS = "(32.085300, 34.781769)";
const DEFAULT_EMAIL = "example@example.com";
const DATE_ID = builders.identifier("Date");
export const DEFAULT_EMPTY_STRING_LITERAL = builders.stringLiteral("");
export const DEFAULT_ADDRESS_LITERAL = builders.stringLiteral(DEFAULT_ADDRESS);
export const DEFAULT_BOOLEAN_LITERAL = builders.booleanLiteral(false);
export const EMPTY_ARRAY_EXPRESSION = builders.arrayExpression([]);
export const DEFAULT_NUMBER_LITERAL = builders.numericLiteral(0);
export const DEFAULT_EMAIL_LITERAL = builders.stringLiteral(DEFAULT_EMAIL);
export const NEW_DATE_EXPRESSION = builders.newExpression(DATE_ID, []);
export const NEW_JSON_EXPRESSION = builders.objectExpression([
  builders.objectProperty(
    builders.stringLiteral("foo"),
    builders.stringLiteral("bar")
  ),
]);
export const AUTH_FIELD_NAMES = new Set(
  USER_AUTH_FIELDS.map((field) => field.name)
);

export const createDefaultAuthProperties = ({
  userNameFieldName,
  userPasswordFieldName,
  userRolesFieldName,
}: SeedProperties) => [
  builders.objectProperty(
    builders.identifier(userNameFieldName),
    builders.stringLiteral(ADMIN_USERNAME)
  ),
  builders.objectProperty(
    builders.identifier(userPasswordFieldName),
    awaitExpression`await hash("${ADMIN_PASSWORD}", bcryptSalt)`
  ),
  builders.objectProperty(
    builders.identifier(userRolesFieldName),
    builders.arrayExpression([builders.stringLiteral(ADMIN_ROLE)])
  ),
];

export async function createSeed(): Promise<Module[]> {
  const {
    serverDirectories,
    entities,
    userEntityName,
    userNameFieldName,
    userPasswordFieldName,
    userRolesFieldName,
  } = DsgContext.getInstance;

  const fileDir = serverDirectories.scriptsDirectory;
  const outputFileName = "seed.ts";

  const userEntity = entities.find((entity) => entity.name === userEntityName);
  const customProperties = createUserObjectCustomProperties(
    userEntity as Entity
  );

  const template = await readFile(seedTemplatePath);
  const seedingProperties = [
    ...createDefaultAuthProperties({
      userNameFieldName,
      userPasswordFieldName,
      userRolesFieldName,
    }),
    ...customProperties,
  ];
  const templateMapping = {
    DATA: builders.objectExpression(seedingProperties),
  };

  return pluginWrapper(createSeedInternal, EventNames.CreateSeed, {
    template,
    templateMapping,
    fileDir,
    outputFileName,
  });
}

async function createSeedInternal({
  template,
  templateMapping,
  fileDir,
  outputFileName,
}: CreateSeedParams): Promise<Module[]> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { DTOs } = DsgContext.getInstance;

  interpolate(template, templateMapping);

  removeTSVariableDeclares(template);

  const dtoNameToPath = getDTONameToPath(DTOs);
  const dtoImports = importContainedIdentifiers(
    template,
    getImportableDTOs(`${fileDir}/${outputFileName}`, dtoNameToPath)
  );

  addImports(template, dtoImports);

  return [
    {
      path: `${fileDir}/${outputFileName}`,
      code: print(template).code,
    },
  ];
}

export function createUserObjectCustomProperties(
  userEntity: Entity
): namedTypes.ObjectProperty[] {
  return userEntity.fields
    .filter((field) => field.required)
    .map((field): [EntityField, namedTypes.Expression | null] => [
      field,
      createDefaultValue(field, userEntity),
    ])
    .filter(([field, value]) => !AUTH_FIELD_NAMES.has(field.name) && value)
    .map(([field, value]) =>
      builders.objectProperty(
        builders.identifier(field.name),
        // @ts-ignore
        value
      )
    );
}

export function createDefaultValue(
  field: EntityField,
  entity: Entity
): namedTypes.Expression | null {
  switch (field.dataType) {
    case EnumDataType.SingleLineText:
    case EnumDataType.MultiLineText: {
      return DEFAULT_EMPTY_STRING_LITERAL;
    }
    case EnumDataType.Email: {
      return DEFAULT_EMAIL_LITERAL;
    }
    case EnumDataType.WholeNumber: {
      return DEFAULT_NUMBER_LITERAL;
    }
    case EnumDataType.DateTime: {
      return NEW_DATE_EXPRESSION;
    }
    case EnumDataType.DecimalNumber: {
      return DEFAULT_NUMBER_LITERAL;
    }
    case EnumDataType.MultiSelectOptionSet: {
      return EMPTY_ARRAY_EXPRESSION;
    }
    case EnumDataType.OptionSet: {
      const { options } = field.properties as types.OptionSet;
      const [firstOption] = options;
      return memberExpression`${createEnumName(
        field,
        entity
      )}.${createEnumMemberName(firstOption.label)}`;
    }
    case EnumDataType.Boolean: {
      return DEFAULT_BOOLEAN_LITERAL;
    }
    case EnumDataType.GeographicLocation: {
      return DEFAULT_ADDRESS_LITERAL;
    }
    case EnumDataType.Json: {
      return NEW_JSON_EXPRESSION;
    }
    case EnumDataType.Id:
    case EnumDataType.CreatedAt:
    case EnumDataType.UpdatedAt:
    case EnumDataType.Roles:
    case EnumDataType.Password:
    case EnumDataType.Username: {
      return null;
    }
    case EnumDataType.Lookup: {
      throw new Error(
        "Cannot create seed user value for a field with Lookup data type"
      );
    }
    default: {
      throw new Error(`Unexpected data type: ${field.dataType}`);
    }
  }
}
