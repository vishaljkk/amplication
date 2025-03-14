import { print, readFile } from "@amplication/code-gen-utils";
import { EnumAuthProviderType } from "../../../models";
import { Module } from "@amplication/code-gen-types";

export async function createTokenServiceTests(
  authTestsDir: string,
  authProvider: EnumAuthProviderType
): Promise<Module> {
  const name =
    authProvider === EnumAuthProviderType.Http ? "Basic" : authProvider;
  const templatePath = require.resolve(
    `./${name.toLowerCase()}Token.service.spec.template.ts`
  );
  const file = await readFile(templatePath);
  const filePath = `${authTestsDir}/token.service.spec.ts`;

  return { code: print(file).code, path: filePath };
}
