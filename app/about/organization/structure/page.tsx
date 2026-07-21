import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organizational Structure | JKA Bangladesh",
};

export default function OrganizationalStructurePage() {
  return (
    <div className="prose prose-zinc max-w-none prose-headings:font-karate prose-h1:text-4xl prose-h1:mb-6 prose-h1:text-zinc-900 prose-h2:text-2xl prose-h2:text-zinc-800 prose-h2:mt-10 prose-h2:mb-4 prose-p:text-zinc-700 prose-p:leading-relaxed">
      <h1>Organizational Structure</h1>
      
      <p>
        The Japan Karate Association is the only independent karate entity legally and officially recognized by the Japanese government as an association of members (Shadan Hojin) for the promotion of karate. There is only one other authorized entity which falls under the umbrella of the JKA: the JKA World Federation (JKA/WF). No other organization shares this status.
      </p>
      
      <p>
        For the most part, the JKA is centrally organized and coordinated through Tokyo JKA HQ, although there are both National and Regional headquarters in most areas around the world.
      </p>

      <h2>JKA Organization</h2>
      <div className="overflow-x-auto mt-6">
        <table className="min-w-full border-collapse border border-zinc-200">
          <tbody>
            <tr className="border-b border-zinc-200">
              <th className="p-3 text-left font-semibold text-zinc-900 bg-zinc-50 w-1/4 border-r border-zinc-200">Chairman</th>
              <td className="p-3 text-zinc-700" colSpan={3}>Kusahara Katsuhide</td>
            </tr>
            <tr className="border-b border-zinc-200">
              <th className="p-3 text-left font-semibold text-zinc-900 bg-zinc-50 border-r border-zinc-200">Senior Managing Director</th>
              <td className="p-3 text-zinc-700" colSpan={3}>Izumiya Seizo</td>
            </tr>
            <tr className="border-b border-zinc-200">
              <th className="p-3 text-left font-semibold text-zinc-900 bg-zinc-50 border-r border-zinc-200">Executive Director</th>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 w-1/4">Shina Katsutoshi</td>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 w-1/4">Taniyama Takuya</td>
              <td className="p-3 text-zinc-700 w-1/4">Naka Tatsuya</td>
            </tr>
            <tr>
              <th className="p-3 text-left font-semibold text-zinc-900 bg-zinc-50 border-r border-zinc-200" rowSpan={5}>Board of Directors</th>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 border-b border-zinc-200">Adachi Kazuko</td>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 border-b border-zinc-200">Imura Yutaka</td>
              <td className="p-3 text-zinc-700 border-b border-zinc-200">Oishi Takeshi</td>
            </tr>
            <tr>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 border-b border-zinc-200">Okada Hiroshi</td>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 border-b border-zinc-200">Kanai Seikon</td>
              <td className="p-3 text-zinc-700 border-b border-zinc-200">Kitai Kumiko</td>
            </tr>
            <tr>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 border-b border-zinc-200">Kurebayashi Kengo</td>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 border-b border-zinc-200">Kosaka Toshihiro</td>
              <td className="p-3 text-zinc-700 border-b border-zinc-200">Goukon Ikuo</td>
            </tr>
            <tr>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 border-b border-zinc-200">Saito Takao</td>
              <td className="p-3 text-zinc-700 border-r border-zinc-200 border-b border-zinc-200">Takahashi Michiyasu</td>
              <td className="p-3 text-zinc-700 border-b border-zinc-200">Terawaki Kazumine</td>
            </tr>
            <tr>
              <td className="p-3 text-zinc-700 border-r border-zinc-200">Nakatsuka Kiyoshi</td>
              <td className="p-3 text-zinc-700 border-r border-zinc-200">Yano Kenji</td>
              <td className="p-3 text-zinc-700">Yamaguchi Takashi</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
