import nx from "@nx/eslint-plugin";
import { builtinModules } from "node:module";

/**
 * Regras adicionais para libs `type:domain`. O `allowedExternalImports: []` do
 * enforce-module-boundaries só enxerga pacotes npm do grafo do Nx; módulos
 * nativos do Node (`fs`, `node:crypto`...) não passam por ele e são barrados aqui.
 */
export const domainLayer = [
    {
        files: ["**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: builtinModules.map((name) => ({
                        name,
                        message: "Domain libs must not use Node.js APIs."
                    })),
                    patterns: [
                        {
                            group: ["node:*"],
                            message: "Domain libs must not use Node.js APIs."
                        }
                    ]
                }
            ],
            // `no-restricted-imports` não cobre require() nem import() dinâmico
            "@typescript-eslint/no-require-imports": "error",
            "no-restricted-syntax": [
                "error",
                {
                    selector: "ImportExpression",
                    message: "Domain libs must not use dynamic imports."
                }
            ]
        }
    }
];

export default [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    {
        ignores: [
            "**/dist",
            "**/out-tsc"
        ]
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.js",
            "**/*.jsx"
        ],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: [
                        "^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"
                    ],
                    depConstraints: [
                        // Camada contracts: só contracts e domain (tipos comuns)
                        {
                            sourceTag: "type:contracts",
                            onlyDependOnLibsWithTags: ["type:contracts", "type:domain"]
                        },
                        // Camada application: application, domain e contracts (nunca infra)
                        {
                            sourceTag: "type:application",
                            onlyDependOnLibsWithTags: ["type:application", "type:domain", "type:contracts"]
                        },
                        // Camada infra: implementa ports de application (dependência infra → application)
                        {
                            sourceTag: "type:infra",
                            onlyDependOnLibsWithTags: ["type:infra", "type:application", "type:domain", "type:contracts"]
                        },
                        // Camada domain: só depende de domain e não importa pacotes externos
                        {
                            sourceTag: "type:domain",
                            onlyDependOnLibsWithTags: ["type:domain"],
                            allowedExternalImports: []
                        },
                        // shared/domain: não depende de nenhuma lib
                        {
                            allSourceTags: ["scope:shared", "type:domain"],
                            onlyDependOnLibsWithTags: []
                        },
                        // shared: só depende de shared (nunca import/quiz)
                        {
                            sourceTag: "scope:shared",
                            onlyDependOnLibsWithTags: ["scope:shared"]
                        },
                        // import: só import ou shared (nunca quiz)
                        {
                            sourceTag: "scope:import",
                            onlyDependOnLibsWithTags: ["scope:import", "scope:shared"]
                        },
                        // api: compõe os contextos (import) e o kernel compartilhado
                        {
                            sourceTag: "scope:api",
                            onlyDependOnLibsWithTags: ["scope:shared", "scope:import"]
                        },
                        // web: sem acesso direto a libs neste estágio
                        {
                            sourceTag: "scope:web",
                            onlyDependOnLibsWithTags: []
                        }
                    ]
                }
            ]
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.cts",
            "**/*.mts",
            "**/*.js",
            "**/*.jsx",
            "**/*.cjs",
            "**/*.mjs"
        ],
        // Override or add rules here
        rules: {}
    }
];
