import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const ESCROW_CONTRACT_NAME = "lex-nakamoto-escrow";

async function isEscrowAlreadyDeployed(network: "testnet" | "mainnet", projectRoot: string) {
  const planFile = path.join(projectRoot, "deployments", `default.${network}-plan.yaml`);
  if (!fs.existsSync(planFile)) return false;

  const planYaml = fs.readFileSync(planFile, "utf8");
  const expectedSenderMatch = planYaml.match(/expected-sender:\s*([ST][A-Z0-9]{20,50})/);
  const expectedSender = expectedSenderMatch?.[1]?.trim();
  if (!expectedSender) return false;

  const apiBase = network === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";
  const url = `${apiBase}/v2/contracts/source/${expectedSender}/${ESCROW_CONTRACT_NAME}`;
  try {
    const resp = await fetch(url);
    return resp.ok;
  } catch {
    return false;
  }
}

function runClarinet(
  cwd: string,
  args: string[],
  timeoutMs = 180000,
): Promise<{ code: number | null; stdout: string; stderr: string; error?: string }> {
  return new Promise((resolve) => {
    const parts: string[] = [];
    const errs: string[] = [];

    const proc = spawn("clarinet", args, { cwd, shell: false });

    const timer = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch {}
      resolve({ code: null, stdout: parts.join(''), stderr: errs.join(''), error: 'timeout' });
    }, timeoutMs);

    proc.stdout.on("data", (d) => parts.push(String(d)));
    proc.stderr.on("data", (d) => errs.push(String(d)));

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: null, stdout: parts.join(''), stderr: errs.join(''), error: String(err) });
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: parts.join(''), stderr: errs.join('') });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const projectRoot = process.env.PROJECT_ROOT ?? "../";
  const resolvedProjectRoot = path.resolve(process.cwd(), projectRoot);
  const network = req.body?.network === "mainnet" ? "mainnet" : "testnet";
  const args = ["deployments", "apply", `--${network}`, "--no-dashboard"];
  const settingsPath = path.join(
    resolvedProjectRoot,
    "settings",
    network === "mainnet" ? "Mainnet.toml" : "Testnet.toml",
  );

  if (!fs.existsSync(settingsPath)) {
    return res.status(400).json({
      success: false,
      network,
      error: `Missing settings file: ${settingsPath}`,
    });
  }

  const settingsToml = fs.readFileSync(settingsPath, "utf8");
  if (settingsToml.includes("<YOUR PRIVATE") || settingsToml.includes("<YOUR")) {
    return res.status(400).json({
      success: false,
      network,
      error: `Set a real mnemonic in ${settingsPath} before deploying.`,
    });
  }

  // Fast path: if contract already exists, avoid long-running redeploy attempt.
  if (await isEscrowAlreadyDeployed(network, resolvedProjectRoot)) {
    return res.status(200).json({
      success: true,
      network,
      alreadyDeployed: true,
      message: "Contract already deployed on target network.",
    });
  }

  // Run direct deployment against public network RPC (no local devnet required)
  try {
    const result = await runClarinet(resolvedProjectRoot, args);
    if (result.error) {
      return res.status(500).json({ success: false, network, args, error: result.error, stdout: result.stdout, stderr: result.stderr });
    }
    if (result.code !== 0) {
      return res.status(500).json({ success: false, network, args, code: result.code, stdout: result.stdout, stderr: result.stderr });
    }
    return res.status(200).json({ success: true, network, args, stdout: result.stdout });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
}
