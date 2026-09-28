module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "scope-enum": [
            2,
            "always",
            [
                // Dependabot emits these two when commit-message.include is
                // set to "scope".
                "deps",
                "deps-dev",
            ],
        ],
    },
};
