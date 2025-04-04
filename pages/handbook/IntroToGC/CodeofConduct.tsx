// pages/handbook/IntroToGC/Welcome.tsx
import HandbookLayout from "../../../components/handbook_components/handbook_layout";
import HandbookSection from "../../../components/handbook_components/handbook_section";

const Chapter1Subchapter2Page = () => {
  return (
    <HandbookLayout>
      <HandbookSection
        title="HB/S3 - The Code of Conduct"
        blocks={[
          {
            blockTitle: "HB/PB-20 - Code of Conduct",
            blockContent: (
            <div>
                <p>In order to enjoy our time together, all members of GC must abide by this code of conduct. 
                    Common sense should prevail, but this code sets out expectations of our behaviour and represents the values of GC. 
                    Values which as members it is our responsibility to defend.</p>
                    <div className="mt-4 ml-10">
                    <ul className="list-disc pl-5">
                        <li>I am a part of GC, a group of people with diverse backgrounds and cultures. I will show respect to all members.</li>
                        <li>In order to facilitate in-game organisation I will respect and uphold the chain of command.</li>
                        <li>I will make a conscious effort to learn our SOPs over time and promote and apply them.</li>
                        <li>I will demonstrate good sportsmanship and integrity at all times.</li>
                        <li>If conflict should arise, I will step back, inform a member of Staff and abstain from retaliating.</li>
                        <li>If I believe a member did something well, I will praise them publicly.</li>
                        <li>If I believe a member did something wrong, I will talk it out and correct it in private.</li>
                        <li>I will remember that we are all here to have fun.</li>
                    </ul>
                    </div>
            </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-21 - Culture",
            blockContent: (
              <div>
                <p>GC is a diverse, multicultural and multinational organisation. 
                    We have no intention to codify each and every aspect of interpersonal relations within our community. 
                    Some members have been playing together for more than 15 years. Obviously their interactions between each other are going to be different from interactions between new members. 
                    Taken out of context, those might seem disrespectful. 
                    There is no quick and easy way to learn this, but if you are a new member and are unsure if something might be considered disrespectful, it is probably best to show restraint. 
                    Observe and get used to our culture. It will come in due time.</p>
              </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-22 - Standards",
            blockContent: (
              <div>
                <p>All members of GC must follow these basic standards;</p>
                <div className="mt-4 ml-10">
                    <ul className="list-disc pl-5">
                    <li>Don't be a dick.</li>
                    <li>Respect everybody with the same level of dignity you'd expect.</li>
                    <li>Uphold quality of gameplay at all times.</li>
                    <li>Strive for semi-serious tactical milsim fun.</li>
                    <li>Provide constructive feedback.</li>
                    <li>Trust in your leadership, respect the chain of command.</li>
                    <li>Have fun!</li>
                    </ul>
                </div>
              </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-23 - Representing GC",
            blockContent: (
              <div>
                <p> 
                GC is an open community, with no attendance requirements. 
                Members are free to represent GC in any way they feel, and are free to play at other groups any time. 
                The only prohibition is degrading the public image of GC with other communities. </p>
              </div>
            ),
            buttonLabel: "Policy",
          },
          {
            blockTitle: "HB/PB-24 - Violations of the Code of Conduct",
            blockContent: (
              <div>
                <p>Breaches of the Code of Conduct will be discussed among the staff team, and enforcement actions can be put up to community votes if applicable.</p>
                <div className="mt-4 ml-10">
                    <ul className="list-disc pl-5">
                        <li>Informal Warning: A member of the staff can issue you with an informal warning. 
                            This carries no actual punishment, but is a reminder to correct a behavior. 
                            It can be used as further justification in future infraction discussions.</li>
                        
                        <li>Formal Warning: A member of the staff can motion a formal warning. 
                            This is put up to a poll that the community votes on. 
                            This is a 4 strike penalty system with the 4th being a permanent ban from GC.</li>

                        <li>Temp ban: A temp ban motion can be put forward by the Admins, or Game Moderators. 
                            This is put up to a poll that the community votes on.</li>

                        <li>Timeout: This is a temporary mute on the Discord that can be issued by the Discord Moderators for infractions.</li>
                    </ul>
                </div>
              </div>
            ),
            buttonLabel: "Policy",
          },
        ]}
      />
    </HandbookLayout>
  );
};

export default Chapter1Subchapter2Page;