const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

const suites = [
  {
    name: "Timur piece movement baseline",
    script: path.join("tests", "timur-piece-movement-probe.js"),
  },
  {
    name: "Timur piece edge and blocker coverage",
    script: path.join("tests", "timur-piece-edge-blocker-probe.js"),
  },
  {
    name: "Timur native special-rule smoke",
    script: path.join("tests", "timur-native-rule-smoke.js"),
  },
  {
    name: "Timur app-state parity fixtures",
    script: path.join("tests", "timur-app-state-parity.js"),
  },
];

function runSuite(suite) {
  return new Promise((resolve) => {
    console.log(`\n=== ${suite.name} ===`);
    const child = spawn(process.execPath, [suite.script], {
      cwd: rootDir,
      stdio: "inherit",
      shell: false,
    });

    child.on("close", (code) => {
      resolve({ ...suite, code });
    });
  });
}

(async () => {
  const results = [];
  for (const suite of suites) {
    results.push(await runSuite(suite));
  }

  const failed = results.filter((result) => result.code !== 0);
  console.log("\n=== Timur rule test summary ===");
  for (const result of results) {
    console.log(`${result.code === 0 ? "PASS" : "FAIL"} ${result.name}`);
  }

  if (failed.length) {
    process.exit(1);
  }
})();
