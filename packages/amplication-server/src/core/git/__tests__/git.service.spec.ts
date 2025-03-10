import {
  GitModule,
  GitService,
  GithubService,
  GitServiceFactory,
} from "@amplication/git-utils";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService, EnumResourceType } from "../../../prisma";
import { Resource } from "../../../models/Resource";
import { EnumGitProvider } from "../dto/enums/EnumGitProvider";
import { RemoteGitRepositoriesWhereUniqueInput } from "../dto/inputs/RemoteGitRepositoriesWhereUniqueInput";
import { GitProviderService } from "../git.provider.service";
import { TEST_GIT_REPOS } from "../__mocks__/GitRepos";
import { MOCK_GIT_SERVICE_FACTORY } from "../utils/GitServiceFactory/GitServiceFactory.mock";
import { CreateGitRepositoryInput } from "../dto/inputs/CreateGitRepositoryInput";
import { GitRepository } from "../../../models/GitRepository";
import { GitOrganization } from "../../../models/GitOrganization";
import { EnumGitOrganizationType } from "../dto/enums/EnumGitOrganizationType";
import { ResourceService } from "../../resource/resource.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
const EXAMPLE_GIT_REPOSITORY: GitRepository = {
  id: "exampleGitRepositoryId",
  name: "repositoryTest",
  gitOrganizationId: "exampleGitOrganizationId",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const EXAMPLE_GIT_ORGANIZATION: GitOrganization = {
  id: "exampleGitOrganizationId",
  provider: EnumGitProvider.Github,
  type: EnumGitOrganizationType.Organization,
  name: "organizationTest",
  installationId: "123456",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEFAULT_RESOURCE_DATA = {
  color: "DEFAULT_RESOURCE_COLOR",
};

const EXAMPLE_SERVICE_RESOURCE: Resource = {
  ...DEFAULT_RESOURCE_DATA,
  id: "EXAMPLE_RESOURCE_ID",
  resourceType: EnumResourceType.Service,
  createdAt: new Date(),
  updatedAt: new Date(),
  name: "EXAMPLE_RESOURCE_NAME",
  description: "EXAMPLE_RESOURCE_DESCRIPTION",
  deletedAt: null,
  gitRepositoryOverride: false,
};

const prismaGitRepositoryCreateMock = jest.fn(() => {
  return EXAMPLE_GIT_REPOSITORY;
});

const prismaGitOrganizationCreateMock = jest.fn(() => {
  return EXAMPLE_GIT_ORGANIZATION;
});

const prismaResourceCreateMock = jest.fn(() => {
  return EXAMPLE_SERVICE_RESOURCE;
});

const prismaGitRepositoryReturnEmptyMock = jest.fn(() => {
  return null;
});

describe("GitService", () => {
  let gitService: GitProviderService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [GitModule, ConfigModule],
      providers: [
        GitProviderService,
        GitService,
        GitServiceFactory,
        GithubService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (!key) {
                return null;
              }
              return key;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            gitRepository: {
              create: prismaGitRepositoryCreateMock,
              findUnique: prismaGitRepositoryReturnEmptyMock,
              findFirst: () => null,
            },
            gitOrganization: {
              findUnique: prismaGitOrganizationCreateMock,
            },
            resource: {
              findUnique: prismaResourceCreateMock,
            },
          },
        },
        {
          provide: GitServiceFactory,
          useValue: MOCK_GIT_SERVICE_FACTORY,
        },
        {
          provide: ResourceService,
          useValue: {
            resource: () => EXAMPLE_SERVICE_RESOURCE,
          },
        },
      ],
    }).compile();

    gitService = module.get<GitProviderService>(GitProviderService);
  });

  it("should be defined", () => {
    expect(gitService).toBeDefined();
  });
  //#region github
  {
    describe("GitService.getReposOfOrganization()", () => {
      it("should return RemoteGitRepositories[]", async () => {
        const remoteGitRepositoriesWhereUniqueInput: RemoteGitRepositoriesWhereUniqueInput =
          {
            gitOrganizationId: "exampleGitOrganizationId",
            gitProvider: EnumGitProvider.Github,
            limit: 2,
            page: 1,
          };
        const remoteGitRepositories = await gitService.getReposOfOrganization(
          remoteGitRepositoriesWhereUniqueInput
        );
        expect(remoteGitRepositories).toEqual(TEST_GIT_REPOS);
      });
    });
    describe("GitService.createRepo()", () => {
      it("should return Resource", async () => {
        const createGitRepositoryInput: CreateGitRepositoryInput = {
          name: "EXAMPLE_RESOURCE_NAME",
          resourceId: "EXAMPLE_RESOURCE_DESCRIPTION",
          gitOrganizationId: "exampleGitOrganizationId",
          gitProvider: EnumGitProvider.Github,
          public: true,
          gitOrganizationType: EnumGitOrganizationType.Organization,
        };
        expect(
          await gitService.createRemoteGitRepository(createGitRepositoryInput)
        ).toEqual(EXAMPLE_SERVICE_RESOURCE);
        expect(prismaResourceCreateMock).toBeCalledTimes(1);
      });
    });
  }
  //#endregion
});
