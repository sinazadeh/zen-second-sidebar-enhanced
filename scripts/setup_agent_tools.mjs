import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), "..");
const manifestPath = resolve(repositoryRoot, "agent-tools.json");
const generatedRoot = resolve(repositoryRoot, ".agent-tools");
const skillRoot = resolve(repositoryRoot, ".agents", "skills");

function isWithin(parent, child) {
  const pathFromParent = relative(parent, child);
  return (
    pathFromParent !== "" &&
    pathFromParent !== ".." &&
    !pathFromParent.startsWith(
      `..${process.platform === "win32" ? "\\" : "/"}`,
    ) &&
    !isAbsolute(pathFromParent)
  );
}

function run(command, args, cwd = repositoryRoot) {
  const isWindowsCommand =
    process.platform === "win32" && command.endsWith(".cmd");
  const executable = isWindowsCommand
    ? (process.env.ComSpec ?? "cmd.exe")
    : command;
  const executableArguments = isWindowsCommand
    ? ["/d", "/s", "/c", command, ...args]
    : args;
  const result = spawnSync(executable, executableArguments, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export function validateAgentToolsManifest(manifest) {
  const errors = [];
  if (manifest.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (!Number.isInteger(manifest.minimumNodeMajor)) {
    errors.push("minimumNodeMajor must be an integer");
  }

  const names = new Set();
  for (const source of manifest.skillSources ?? []) {
    if (!/^[a-z0-9-]+$/.test(source.id ?? "")) {
      errors.push(`invalid source id: ${source.id}`);
    }
    if (
      !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(source.repository)
    ) {
      errors.push(`${source.id}: repository must be a GitHub HTTPS clone URL`);
    }
    if (!/^[0-9a-f]{40}$/.test(source.commit)) {
      errors.push(`${source.id}: commit must be a full Git SHA`);
    }
    for (const skill of source.skills ?? []) {
      if (!skill.path.startsWith("skills/") || skill.path.includes("..")) {
        errors.push(`${source.id}/${skill.name}: unsafe skill path`);
      }
      if (!/^[a-z0-9-]+$/.test(skill.name)) {
        errors.push(`${source.id}: invalid skill name ${skill.name}`);
      }
      if (names.has(skill.name)) {
        errors.push(`duplicate skill name: ${skill.name}`);
      }
      names.add(skill.name);
    }
  }

  const design = manifest.designLibrary ?? {};
  if (
    !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(
      design.repository ?? "",
    )
  ) {
    errors.push("designLibrary.repository must be a GitHub HTTPS clone URL");
  }
  if (!/^[0-9a-f]{40}$/.test(design.commit ?? "")) {
    errors.push("designLibrary.commit must be a full Git SHA");
  }
  if (!design.path || design.path.includes("..")) {
    errors.push("designLibrary.path must be a safe relative path");
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest.playwright?.version ?? "")) {
    errors.push("playwright.version must be an exact semantic version");
  }
  if (manifest.playwright?.package !== "playwright") {
    errors.push("playwright.package must be playwright");
  }
  return errors;
}

async function loadManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function checkoutSource(id, repository, commit) {
  const sourcesRoot = resolve(generatedRoot, "sources");
  const checkout = resolve(sourcesRoot, id);
  if (!isWithin(sourcesRoot, checkout)) {
    throw new Error(`Refusing unsafe source path: ${checkout}`);
  }
  await mkdir(sourcesRoot, { recursive: true });
  if (!(await exists(resolve(checkout, ".git")))) {
    run("git", [
      "clone",
      "--filter=blob:none",
      "--no-checkout",
      repository,
      checkout,
    ]);
  }
  run("git", ["-C", checkout, "fetch", "--depth", "1", "origin", commit]);
  run("git", ["-C", checkout, "checkout", "--detach", "FETCH_HEAD"]);
  return checkout;
}

async function replaceGeneratedDirectory(source, destination, allowedRoot) {
  if (!isWithin(allowedRoot, destination)) {
    throw new Error(
      `Refusing to replace path outside ${allowedRoot}: ${destination}`,
    );
  }
  if (!(await exists(source))) {
    throw new Error(`Configured source path does not exist: ${source}`);
  }
  await mkdir(dirname(destination), { recursive: true });
  await rm(destination, { force: true, recursive: true });
  await cp(source, destination, { recursive: true });
}

async function installSkills(manifest) {
  for (const source of manifest.skillSources) {
    const checkout = await checkoutSource(
      source.id,
      source.repository,
      source.commit,
    );
    for (const skill of source.skills) {
      const sourcePath = resolve(checkout, skill.path);
      const destination = resolve(skillRoot, skill.name);
      await replaceGeneratedDirectory(sourcePath, destination, skillRoot);
      console.log(`Installed skill ${skill.name}`);
    }
  }
}

async function installDesignLibrary(manifest) {
  const design = manifest.designLibrary;
  const checkout = await checkoutSource(
    "awesome-design-md",
    design.repository,
    design.commit,
  );
  await replaceGeneratedDirectory(
    resolve(checkout, design.path),
    resolve(generatedRoot, "design-library"),
    generatedRoot,
  );
  console.log("Installed the Awesome Design MD reference library");
}

function installPlaywright(manifest, withBrowser) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const runtimeRoot = resolve(generatedRoot, "playwright-runtime");
  const specifier = `${manifest.playwright.package}@${manifest.playwright.version}`;
  run(npm, [
    "install",
    "--prefix",
    runtimeRoot,
    "--no-save",
    "--package-lock=false",
    specifier,
  ]);
  if (withBrowser) {
    run(process.execPath, [
      resolve(runtimeRoot, "node_modules", "playwright", "cli.js"),
      "install",
      manifest.playwright.browser,
    ]);
  }
  console.log(`Installed ${specifier}`);
}

async function checkInstallation(manifest) {
  const missing = [];
  for (const source of manifest.skillSources) {
    for (const skill of source.skills) {
      const skillPath = resolve(skillRoot, skill.name, "SKILL.md");
      if (!(await exists(skillPath))) {
        missing.push(`skill ${skill.name}`);
      } else {
        const contents = await readFile(skillPath, "utf8");
        const installedName = contents.match(/^name:\s*([^\r\n]+)$/m)?.[1];
        if (installedName !== skill.name) {
          missing.push(
            `skill ${skill.name} (found name ${installedName ?? "none"})`,
          );
        }
      }
    }
  }
  if (!(await exists(resolve(generatedRoot, "design-library")))) {
    missing.push("Awesome Design MD library");
  }

  const packagePath = resolve(
    generatedRoot,
    "playwright-runtime",
    "node_modules",
    manifest.playwright.package,
    "package.json",
  );
  if (!(await exists(packagePath))) {
    missing.push(
      `${manifest.playwright.package}@${manifest.playwright.version}`,
    );
  } else {
    const installed = JSON.parse(await readFile(packagePath, "utf8"));
    if (installed.version !== manifest.playwright.version) {
      missing.push(
        `${manifest.playwright.package}@${manifest.playwright.version} (found ${installed.version})`,
      );
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing or outdated: ${missing.join(", ")}`);
  }
  console.log("Agent tools match agent-tools.json");
}

export async function main(args = process.argv.slice(2)) {
  const knownArguments = new Set(["--check", "--with-browser"]);
  const unknown = args.filter((argument) => !knownArguments.has(argument));
  if (unknown.length > 0) {
    throw new Error(`Unknown argument: ${unknown.join(", ")}`);
  }

  const manifest = await loadManifest();
  const errors = validateAgentToolsManifest(manifest);
  if (errors.length > 0) {
    throw new Error(`Invalid agent-tools.json:\n- ${errors.join("\n- ")}`);
  }
  const nodeMajor = Number.parseInt(process.versions.node, 10);
  if (nodeMajor < manifest.minimumNodeMajor) {
    throw new Error(
      `Node ${manifest.minimumNodeMajor}+ is required; found ${process.versions.node}`,
    );
  }

  if (args.includes("--check")) {
    await checkInstallation(manifest);
    return;
  }

  await installSkills(manifest);
  await installDesignLibrary(manifest);
  installPlaywright(manifest, args.includes("--with-browser"));
  await mkdir(generatedRoot, { recursive: true });
  await writeFile(
    resolve(generatedRoot, "state.json"),
    `${JSON.stringify({ installedAt: new Date().toISOString(), manifest }, null, 2)}\n`,
  );
  await checkInstallation(manifest);
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
