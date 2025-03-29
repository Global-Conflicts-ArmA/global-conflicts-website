// pages/handbook/chapter4/subchapter1.tsx
import HandbookLayout from "../../../components/handbook_components/handbook_layout";
import HandbookSection from "../../../components/handbook_components/handbook_section";

const Chapter4Subchapter1Page = () => {
  return (
    <HandbookLayout>
      <HandbookSection
        title="Section 1"
        blocks={[
          {
            blockTitle: "Block A - With Bullet Points",
            blockContent: (
              <ul className="list-disc pl-5">
                <li>First point about Block A.</li>
                <li>Second point with more details.</li>
                <li>Third point for emphasis.</li>
              </ul>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "Block B - With Image",
            blockContent: (
              <div>
                <p>This is Block B with an image below:</p>
                <img
                  src="https://via.placeholder.com/150"
                  alt="Example Image"
                  className="mt-2 rounded"
                />
              </div>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "Block C - Mixed Content",
            blockContent: (
              <div>
                <p>Here’s some text with bullet points and an image:</p>
                <ul className="list-disc pl-5">
                  <li>Point one about Block C.</li>
                  <li>Point two with a twist.</li>
                </ul>
                <img
                  src="https://via.placeholder.com/100"
                  alt="Small Example"
                  className="mt-2 rounded"
                />
              </div>
            ),
            buttonLabel: "Skill",
          },
        ]}
      />
      <HandbookSection
        title="Section 2"
        blocks={[
          {
            blockTitle: "Block D",
            blockContent: "This is Block D with plain text.",
            buttonLabel: "Policy",
          },
          {
            blockTitle: "Block E - Bullet Points",
            blockContent: (
              <ul className="list-disc pl-5">
                <li>E1: First item.</li>
                <li>E2: Second item.</li>
                <li>E3: Third item.</li>
              </ul>
            ),
            buttonLabel: "Guide",
          },
          {
            blockTitle: "Block F - Image",
            blockContent: (
              <img
                src="https://via.placeholder.com/200"
                alt="Larger Example"
                className="rounded"
              />
            ),
            buttonLabel: "Skill",
          },
          {
            blockTitle: "Block G - Mixed",
            blockContent: (
              <div>
                <p>Block G has both:</p>
                <ul className="list-disc pl-5">
                  <li>Item one.</li>
                  <li>Item two.</li>
                </ul>
                <img
                  src="https://via.placeholder.com/120"
                  alt="Mixed Example"
                  className="mt-2 rounded"
                />
              </div>
            ),
            buttonLabel: "Policy",
          },
        ]}
      />
    </HandbookLayout>
  );
};

export default Chapter4Subchapter1Page;