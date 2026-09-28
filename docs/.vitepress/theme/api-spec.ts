import { withBase } from "vitepress";

export type OpenApiDocument = Record<string, unknown>;

type SchemaNode = Record<string, unknown>;

type Components = {
    securitySchemes?: Record<string, SchemaNode>;
};

const documents = new Map<string, Promise<OpenApiDocument>>();

const formatExamples: Record<string, string> = {
    uuid: "0199d2a4-5c3e-7b1a-9f6e-2d8c4b7a1e05",
    date: "2027-11-01",
    "date-time": "2027-11-01T09:00:00Z",
    duration: "PT30M",
    uri: "https://files.eventail.example.com/avatar.webp",
    "uri-reference": "/editions",
    email: "speaker@example.com",
    rgb: "#1e88e5",
};

const dataKeys = new Set(["example", "examples", "default", "const", "enum"]);

const hasSampleValue = (node: SchemaNode): boolean =>
    node.example !== undefined ||
    node.examples !== undefined ||
    node.const !== undefined ||
    node.default !== undefined;

// Remove once vitepress-openapi builds samples from enums, string formats and nullable anyOf
// members itself: https://github.com/enzonotario/vitepress-openapi/issues/349
const exampleFor = (node: SchemaNode): unknown => {
    if (Array.isArray(node.anyOf)) {
        const members = (node.anyOf as SchemaNode[]).filter((member) => member.type !== "null");

        return members.length === 1 && Array.isArray(members[0].examples)
            ? members[0].examples[0]
            : undefined;
    }

    if (Array.isArray(node.enum)) {
        return node.enum.find((value) => value !== null);
    }

    return typeof node.format === "string" ? formatExamples[node.format] : undefined;
};

const adjustForDisplay = (node: unknown): void => {
    if (Array.isArray(node)) {
        node.forEach(adjustForDisplay);
        return;
    }

    if (typeof node !== "object" || node === null) {
        return;
    }

    const schema = node as SchemaNode;

    for (const [key, value] of Object.entries(schema)) {
        if (!dataKeys.has(key)) {
            adjustForDisplay(value);
        }
    }

    if (schema.minimum === Number.MIN_SAFE_INTEGER) {
        delete schema.minimum;
    }

    if (schema.maximum === Number.MAX_SAFE_INTEGER) {
        delete schema.maximum;
    }

    if (!hasSampleValue(schema)) {
        const example = exampleFor(schema);

        if (example !== undefined) {
            schema.examples = [example];
        }
    }
};

// Remove once vitepress-openapi prefixes http bearer values with "Bearer " itself:
// https://github.com/enzonotario/vitepress-openapi/issues/350
const addBearerPlaceholder = (document: OpenApiDocument): void => {
    const components = document.components as Components | undefined;

    for (const scheme of Object.values(components?.securitySchemes ?? {})) {
        if (scheme.type === "http" && String(scheme.scheme).toLowerCase() === "bearer") {
            scheme.value = "Bearer <access token>";
        }
    }
};

/**
 * Fetches a version's OpenAPI document once per page load, adjusted for display.
 *
 * zod gives an integer with no bound of its own the safe-integer limits in its place, which the
 * reference would print on each of them, so those bounds are removed. The renderer builds a sample
 * from a schema's `example`, `examples`, `const` or `default`, and prints the bare type otherwise,
 * so a schema with none of them gets an example: its first enum value, a value for its string
 * format, or the example of its only non-null `anyOf` member. A bearer scheme gets a `value`, which
 * is no OpenAPI field: the renderer's code samples print it as the whole `Authorization` header,
 * and the scheme's name when it is missing. The published file keeps none of these changes.
 */
export const loadApiSpec = (version: string): Promise<OpenApiDocument> => {
    let document = documents.get(version);

    if (document === undefined) {
        document = fetch(withBase(`/specs/v${version}.json`))
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`OpenAPI document ${version} answered ${response.status}`);
                }

                const loaded = (await response.json()) as OpenApiDocument;
                adjustForDisplay(loaded);
                addBearerPlaceholder(loaded);

                return loaded;
            })
            .catch((error: unknown) => {
                documents.delete(version);
                throw error;
            });
        documents.set(version, document);
    }

    return document;
};
