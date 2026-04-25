export function resolveBuildId(appName) {
  return (
    process.env.VERCEL_DEPLOYMENT_ID
    || process.env.VERCEL_GIT_COMMIT_SHA
    || `${appName}-${new Date().toISOString()}`
  );
}

export function createVersionPlugin({ appName, buildId }) {
  return {
    name: `emit-${appName}-version`,
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            appName,
            buildId,
            generatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      });
    },
  };
}
