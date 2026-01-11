import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import axios from "axios";

const SPREADSHEET_URL =
    "https://docs.google.com/spreadsheets/d/18eCbua5ZKZ2fNomQIn5AkK8rFLs6E9x3lCx6oPRGOZo/gviz/tq?tqx=out:json";

export interface SpreadsheetMission {
    name: string;
    status: string | null;
    notes: string | null;
    era: string | null;
    unitType: string | null; // Column 6: "Unit Type" → stored as tags
    timesPlayed: number;
    lastPlayed: string | null; // ISO string
}

export async function fetchSpreadsheetMissions(): Promise<SpreadsheetMission[]> {
    const response = await axios.get(SPREADSHEET_URL, { responseType: "text" });
    const raw: string = response.data;

    // Strip Google JSONP wrapper: /*O_o*/ google.visualization.Query.setResponse({...});
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const json = JSON.parse(raw.substring(jsonStart, jsonEnd + 1));

    const rows = json.table.rows;
    const missions: SpreadsheetMission[] = [];

    for (const row of rows) {
        const cells = row.c;
        const name = cells[3]?.v;
        if (!name) continue;

        // Parse Google date format: "Date(YYYY,M,D)" where M is 0-indexed
        let lastPlayed: string | null = null;
        const dateVal = cells[8]?.v;
        if (dateVal && typeof dateVal === "string" && dateVal.startsWith("Date(")) {
            const parts = dateVal.slice(5, -1).split(",").map(Number);
            const d = new Date(parts[0], parts[1], parts[2]);
            if (!isNaN(d.getTime())) {
                lastPlayed = d.toISOString();
            }
        }

        missions.push({
            name: String(name).trim(),
            status: cells[11]?.v ?? null,
            notes: cells[12]?.v ?? null,
            era: cells[5]?.v ?? null,
            unitType: cells[6]?.v ?? null,
            timesPlayed: Number(cells[9]?.v) || 0,
            lastPlayed,
        });
    }

    return missions;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    try {
        const missions = await fetchSpreadsheetMissions();
        return res.status(200).json({ ok: true, missions });
    } catch (error) {
        console.error("Spreadsheet fetch error:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
}
