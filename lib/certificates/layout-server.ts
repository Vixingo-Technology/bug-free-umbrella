import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_LAYOUT, type CertificateLayout } from "./layout";

const LAYOUT_FILE = path.join(
    process.cwd(),
    "lib",
    "certificates",
    "layout.json",
);

/** Read the saved layout file, or return defaults if missing/invalid. */
export async function loadCertificateLayout(): Promise<CertificateLayout> {
    try {
        const buf = await fs.readFile(LAYOUT_FILE, "utf-8");
        const data = JSON.parse(buf) as Partial<CertificateLayout>;
        return { ...DEFAULT_LAYOUT, ...data } as CertificateLayout;
    } catch {
        return DEFAULT_LAYOUT;
    }
}

/** Write the layout to disk. Only works in environments with writable FS. */
export async function saveCertificateLayout(
    layout: CertificateLayout,
): Promise<void> {
    await fs.writeFile(
        LAYOUT_FILE,
        JSON.stringify(layout, null, 2) + "\n",
        "utf-8",
    );
}
