import { readdirSync } from "node:fs";
import { basename } from "node:path";

const versionFilePattern = /^v(\d+\.\d+)\.json$/;

/** Returns the minor version a `vX.Y.json` file holds, or undefined for any other file. */
export const versionOf = (file: string): string | undefined =>
    versionFilePattern.exec(basename(file))?.[1];

export const compareVersions = (left: string, right: string): number => {
    const [leftMajor, leftMinor] = left.split(".").map(Number);
    const [rightMajor, rightMinor] = right.split(".").map(Number);

    return leftMajor === rightMajor ? leftMinor - rightMinor : leftMajor - rightMajor;
};

/** Lists the minor versions a directory holds `vX.Y.json` files for, newest first. */
export const listVersions = (directory: URL): string[] =>
    readdirSync(directory)
        .flatMap((file) => {
            const version = versionOf(file);

            return version === undefined ? [] : [version];
        })
        .sort((left, right) => compareVersions(right, left));
