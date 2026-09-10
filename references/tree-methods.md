# Choose and use a tree method

Read the relevant recipe when creating or changing a branch's method. These are useful families, not a universal taxonomy: teachers use overlapping names. A case subject such as growth, pricing, market entry or acquisition does not determine the tree. Choose by the question and the meaning of each connection.

## Contents

- [Choose from the person's problem](#choose-from-the-persons-problem)
- [Issue tree](#issue-tree)
- [Hypothesis tree](#hypothesis-tree)
- [Driver or equation tree](#driver-or-equation-tree)
- [Solution or how tree](#solution-or-how-tree)
- [Objectives hierarchy](#objectives-hierarchy)
- [Decision tree under uncertainty](#decision-tree-under-uncertainty)
- [Opportunity solution tree](#opportunity-solution-tree)
- [Argument hierarchy](#argument-hierarchy)
- [Move between methods](#move-between-methods)
- [Evaluation scenarios](#evaluation-scenarios)

## Choose from the person's problem

| What the person needs | Useful method | Parent → child means |
| --- | --- | --- |
| Space to discover possibilities | Open exploration | An idea or provisional grouping; no completeness claim |
| Break a broad question into answerable parts | Issue | A subquestion whose answer contributes to answering the parent |
| Investigate a suspected explanation | Hypothesis | A testable implication, condition or relevant evidence |
| Understand what drives a number | Driver | A mathematical contribution with an explicit operator |
| Find ways to achieve an improvement | Solution | A possible means of achieving the parent outcome |
| Clarify what matters in a choice | Objectives | A more specific part of the desired end |
| Compare choices with uncertain outcomes | Decision | A controllable choice or an uncertain event, distinguished explicitly |
| Discover product solutions to customer needs | Opportunity | Outcome → customer opportunity → solution → assumption test |
| Explain a reasoned recommendation | Argument | An argument or evidence supporting the claim above |

Start from the available situation, desired change and constraints. If the user says “Should we run workshops?”, recover whether they want income, stronger customer relationships, a community space, or something else; these lead to different inquiries. Ask only the gap that would change the next useful step. Do not require the user to select a framework or complete an intake questionnaire.

Offer a brief rationale: “I'll separate demand, delivery and economics so we can see which questions would change the launch decision.” Keep the structure editable. An unstructured idea can be added immediately; organise it later without presenting it as analysed. Follow [method.md](method.md) for evidence, scoped MECE and review freshness.

Use `method`, `relation` and the available node kinds as documented in [schema.md](schema.md). These fields describe reasoning; they do not make it correct. Keep formulas, probability assumptions, trade-offs and cross-references explicit in notes. The canvas stores one parent per node: it does not calculate models, represent a causal network, or infer the meaning of an unlabelled connection.

## Issue tree

**Purpose:** Decompose a governing question into questions that can be investigated. Diagnostic “why?” and prescriptive “how?” questions are variants; keep a split's basis coherent. Some teachers also call hypothesis-led structures issue trees.

**Build:** Define the question, scope and horizon. Choose a useful first cut rather than importing a memorised case framework. Write answerable subquestions; deepen the consequential ones into facts or analyses needed. Record what each answer would imply for the parent. Review partitions for overlap and gaps within their stated scope; questions can still have dependencies.

**Hypothetical example:** A bookshop is considering paid workshops next quarter.

```text
Could paid workshops be a viable offer next quarter?
├─ Is there enough demand at a viable price?
│  └─ How many customers would pay £20 for this subject?
├─ Can we deliver them within our constraints?
│  └─ Can preparation and hosting fit five staff-hours weekly?
└─ Do the economics meet our requirement?
   └─ What attendance covers the relevant costs?
```

These are an initial viability inquiry, not exhaustive market-entry due diligence. Price, demand and cost interact. Next inspect existing evidence and identify the unresolved question most likely to change the assessment.

**Avoid:** Placing a proposed remedy beside a possible cause; mixing products, regions and customer types as peer categories; claiming completeness because the tree looks balanced.

**Source:** [McKinsey: seven-step problem solving](https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/how-to-master-the-seven-step-problem-solving-process), including disaggregation and trying different cuts of a problem.

## Hypothesis tree

**Purpose:** Investigate a provisional explanation or proposition, including evidence that could falsify it. A hypothesis is not a conclusion awaiting supporting examples.

**Build:** State the hypothesis and a plausible competing explanation. Derive observable implications and conditions; distinguish a necessary condition from suggestive evidence. Attach supporting and conflicting observations with their limits. Identify evidence that discriminates between explanations. Revise or reject the hypothesis when warranted; several causes may coexist.

**Hypothetical example:** Workshop attendance has fallen.

```text
Hypothesis: the new start time reduced attendance
├─ Does the timing of the decline fit the change?
├─ Do affected customers report a scheduling conflict?
└─ Did comparable sessions at the old time retain attendance?
```

Record competing explanations such as topic appeal or reduced promotion in context or another investigative branch. Even three positive findings would not, by themselves, prove causation. Record confounders before proposing a comparison or test.

**Avoid:** Searching only for confirmation; turning correlations into causes; treating failed predictions as inconvenient details; assuming one hypothesis must explain everything.

**Source:** [Victor Cheng: issue trees](https://caseinterview.com/issue-tree). Cheng's usage overlaps with what this guide labels hypothesis trees; preserve the reasoning rather than policing terminology.

## Driver or equation tree

**Purpose:** Explain a quantitative result through explicit mathematical relationships. Profit, revenue, cost, break-even and market-sizing trees are applications of this family.

**Build:** Define the metric, unit, population and period. Write the equation before drawing branches; show whether inputs add, subtract, multiply or divide. Decompose inputs only where useful. Separate supplied numbers from estimates, check units and arithmetic independently, then examine sensitivity to consequential assumptions.

**Hypothetical example:** One paid workshop has £120 fixed cost, a £20 ticket price and £5 variable cost per attendee.

```text
Break-even attendance = fixed cost ÷ contribution per attendee
├─ Fixed cost: £120 per workshop
└─ Contribution: £20 − £5 = £15 per attendee
   ├─ Ticket price: £20 per attendee
   └─ Variable cost: £5 per attendee

£120 ÷ £15 = 8 attendees
```

This assumes the stated costs are relevant, prices remain constant and no capacity threshold changes them. It establishes a hurdle, not evidence that eight people will buy. Store the equation and assumptions in notes; calculate and check it separately from the canvas.

**Avoid:** Treating multiplicative drivers as additive shares; double-counting customers across segments; mixing weekly and annual inputs; inventing inputs; declaring commercial viability from break-even alone.

**Sources:** [McKinsey Electro-Light case](https://www.mckinsey.com/careers/interviewing/electrolight) for launch economics; [Bain Coffee Shop case](https://www.bain.com/careers/hiring-process/interviewing/coffee-case-study/) for top-down/bottom-up estimation and break-even. These are teaching cases, not observed commercial results.

## Solution or how tree

**Purpose:** Explore mechanisms and interventions that could achieve a defined change. This is a practical prescriptive tree family, not a claim to a single proprietary framework.

**Build:** Define the desired change and constraints. Identify plausible levers, explain how each could affect the outcome, then develop concrete interventions. Separate means from the end they serve. Keep alternatives and useful combinations open; attach dependencies, trade-offs and evidence before ranking.

**Hypothetical example:** A bookshop wants queues below five minutes during Saturday peaks.

```text
Reduce Saturday queue time
├─ Reduce arrivals at the busiest time
│  └─ Offer a quieter collection window
├─ Increase service capacity during the peak
│  └─ Open a second staffed till
└─ Reduce time per transaction
   └─ Prepare collection orders before arrival
```

These interventions can combine. Examine the actual bottleneck: a second till may not help if both tills share a single packing station. Keep the causal link tentative until evidence supports it.

**Avoid:** Listing fashionable tactics without a mechanism; silently converting a brainstorm into mutually exclusive choices; recommending experiments before checking available operational evidence.

**Source:** [Bain FashionCo. case](https://www.bain.com/careers/hiring-process/interviewing/fashion-case-study/) demonstrates moving from diagnosis to generating revenue interventions and evaluating them. The “how tree” grouping here is an interpretation, not Bain's named taxonomy.

## Objectives hierarchy

**Purpose:** Clarify the ends a decision should serve and make them assessable. An objective is something valued; an option or tactic is a possible means.

**Build:** Ask what a good result would provide and why that matters. Separate fundamental ends from means. Decompose broad ends into more specific objectives; define observable measures or clear qualitative descriptions. Identify constraints and trade-offs. Elicit weights only if the decision needs them, and only after defining scales and meaningful differences.

**Hypothetical example:** Someone comparing job offers identifies three desired ends.

```text
What would make a job suitable?
├─ Financial security
│  └─ Reliable income covers stated commitments
├─ Autonomy
│  └─ Control over how work is carried out
└─ Learning
   └─ Regular practice and feedback in chosen skills
```

“Remote work” is a possible means; ask which end it serves rather than assuming everybody values it. Assess the actual offers against the defined objectives; do not invent personal weights.

**Avoid:** Mixing objectives with solutions; double-counting the same benefit under several criteria; arbitrary percentage weights; treating objectives as statistically independent because they have separate branches.

**Source:** [Keeney, McDaniels and Ridge-Cooney: value-focused planning](https://scholars.duke.edu/publication/780189), distinguishing a fundamental objectives hierarchy from a means–ends network. Cross-cutting means may require a network; this canvas can retain explicit references, not render that network faithfully.

## Decision tree under uncertainty

**Purpose:** Compare controllable choices whose outcomes depend on uncertain events. An option list alone is not a formal decision tree.

**Build:** State the decision and what information is available at each point. Separate choices from chance events in temporal order. Specify mutually exclusive, exhaustive outcomes for each chance node; record conditional probabilities and their basis. Put consistent net payoffs or utilities at leaves. Evaluate from leaves back to choices, checking sensitivity and the decision-maker's risk preferences. Do not calculate expected values when probabilities or payoffs are missing.

**Hypothetical example:** Compare holding one event with cancelling. Assume net payoffs and probabilities have been supplied for this illustration.

```text
Hold or cancel?
├─ Hold → attendance (chance)
│  ├─ Strong: probability 0.6; net payoff +£200
│  └─ Weak: probability 0.4; net payoff −£100
└─ Cancel → net payoff £0

Expected net payoff of holding = 0.6 × £200 + 0.4 × (−£100) = £80
```

The expected monetary value favours holding under these assumptions; it does not settle risk tolerance or non-financial objectives. A later decision can use only information available then. The canvas records labels and notes, not an automatic probability/payoff solver.

**Avoid:** Branch probabilities that do not sum to one within a chance node; treating a chance result as a controllable option; using invented likelihoods; counting a cost twice; choosing whichever outcome is best after the fact.

**Source:** [Open University: decision trees and uncertainty](https://www.open.edu/openlearn/money-business/decision-trees-and-dealing-uncertainty/content-section-4.1).

## Opportunity solution tree

**Purpose:** Use Teresa Torres's product-discovery structure to connect a product outcome to customer opportunities, alternative solutions and assumption tests. Preserve its customer-research scope.

**Build:** Choose a meaningful product outcome. Discover customer needs, pain points and desires through research; cluster opportunities while retaining their evidence. Generate several solutions to a selected opportunity. Identify their riskiest assumptions and design proportionate tests. Assess results against the outcome; a test can invalidate a solution without invalidating the customer need.

**Hypothetical example:** A booking product is trying to increase completed bookings.

```text
Increase completed bookings
└─ Customers struggle to find a suitable time (proposed opportunity)
   ├─ Flexible-date search (solution)
   │  └─ Test whether customers can find an acceptable slot
   └─ Availability alerts (solution)
      └─ Test whether alerts arrive while customers still intend to book
```

Without actual customer research, that opportunity remains a hypothesis. Record the research gap instead of presenting it as an observed need. Tests should target explicit assumptions, not simply ask whether people like the feature.

**Avoid:** Relabelling a feature request as an opportunity; substituting company initiatives for customer needs; forcing the method onto generic weekly planning; treating interview evidence as proof that a solution works.

**Sources:** [Teresa Torres: opportunity solution trees](https://www.producttalk.org/2016/08/opportunity-solution-tree/) and [discovering solutions](https://www.producttalk.org/discovering-solutions/).

## Argument hierarchy

**Purpose:** Organise a bounded conclusion, its supporting arguments and evidence. This uses the hierarchy component of Barbara Minto's Pyramid Principle; it is not the entire method or a causal model.

**Build:** State the question and proposed answer. Group reasons that logically support that answer at comparable levels. Place evidence under the specific claims it bears on and explain the inference. Include material counterarguments and limits. Check whether the conclusion is stronger than the premises warrant; revise it when support is incomplete.

**Hypothetical example:** A provisional recommendation is to pilot workshops before committing to a recurring programme.

```text
Pilot before committing (provisional recommendation)
├─ Demand remains uncertain
│  └─ Current expressions of interest involve no purchase commitment
├─ A pilot can answer the attendance question
│  └─ Record the assumptions that make its audience representative
└─ Exposure can be bounded
   └─ Verify venue, staffing and cancellation commitments
```

These are hypothetical premises and checks, not facts about the user's bookshop. If a small pilot would not answer the question, the middle argument fails. Preserve a credible counterargument, such as weak transfer from one event to a recurring programme.

**Avoid:** Starting with a preferred answer and manufacturing support; putting chronological tasks under a conclusion as if they were reasons; mistaking a polished pyramid for verified evidence.

**Source:** [Barbara Minto on MECE and the Pyramid Principle](https://www.mckinsey.com/alumni/news-and-events/global-news/alumni-news/barbara-minto-mece-i-invented-it-so-i-get-to-say-how-to-pronounce-it).

## Move between methods

One problem may need several methods. Preserve the governing question and mark where a branch changes purpose. For example, a launch inquiry may contain a driver tree for break-even, a hypothesis investigation of demand and a solution branch for distribution. Later, an argument hierarchy can explain a recommendation. This is not a mandatory sequence.

**Fictional mixed tree:** a bookshop checks workshop viability. The root uses `issue`; only the break-even branch explicitly switches to `driver`.

```text
Could paid workshops be viable next quarter? [issue]
├─ part-of → What attendance breaks even? [driver override]
│  ├─ calculated-from → Fixed cost: £120
│  └─ calculated-from → Contribution per attendee: £15
│     ├─ calculated-from → Ticket price: £20
│     └─ calculated-from → Variable cost: £5
└─ part-of → Can we attract that attendance? [inherits issue]
   └─ part-of → What do comparable paid bookings tell us?
```

The break-even node's notes hold `£120 ÷ (£20 − £5) = 8 attendees`; contribution notes explain subtraction. Its incoming relation remains `part-of`: economics is one part of the viability inquiry, not an input used to calculate the governing question. Only its own inputs use `calculated-from`. The demand branch remains unresolved; eight attendees is a cost hurdle, not a sales forecast. Delivery constraints still need examining before this inquiry could be called complete.

Set the method on the root for a broad starting approach, or on the selected branch for a local change. Descendants inherit the nearest explicit method; deeper overrides and sibling branches retain theirs. Removing an override restores ancestor inheritance; with no explicit ancestor, the method remains unspecified. Relations never inherit. After a method change, inspect existing node kinds, claims, equations and incoming/outgoing links: selecting a method does not convert those meanings or certify the reasoning. Keep existing content until it has been deliberately reconciled.

Use a scoped segmentation split when asking where a result is concentrated: regions at one level, customer segments at another, with clear counting rules. Segmentation and market sizing are useful applications of issue and driver structures, not reasons to create a separate top-level mode for every case topic.

When real relationships have shared causes, feedback or many-to-many dependencies, say that a tree is a limited view. Reference canonical node IDs in notes and retain one source identity. Do not fabricate multiple parents or pretend that adding relation labels turns the canvas into a causal graph. A faithful map may require a different visual artifact.

## Evaluation scenarios

Use these as fresh tasks for an agent with this skill. Judge the actual saved tree, calculations and dialogue, not whether it repeats the method names. These scenarios specify checks to run; their presence is not evidence that an agent passed them.

| User task | Inspect for |
| --- | --- |
| “Our bookshop has a spare room. Help me think what to do with it.” | Useful possibilities based on known context; at most the material missing question; open exploration; no invented income target or forced recommendation. |
| “Sales fell after our opening hours changed. Is that why?” | A tentative hypothesis, competing explanations, discriminating evidence and no causal conclusion from timing alone. |
| “Tickets are £20, each attendee costs £5 and fixed cost is £120. What attendance breaks even?” | An explicit equation, consistent units, eight attendees, assumptions and demand kept separate. |
| “We want shorter queues. A second till must be the answer.” | The desired change and possible mechanisms examined; competing levers and bottleneck dependencies retained. |
| “Which job should I take? One pays more; the other gives me time to learn.” | User-defined objectives and constraints; ends separated from means; no invented weights or forced score. |
| “Should we hold an event? I don't know attendance probabilities yet.” | Choice distinguished from chance; missing probabilities visible; no fabricated expected-value calculation. |
| “Make an opportunity solution tree for weekly chores.” | Scope mismatch explained briefly; a suitable objectives/solution structure offered without relabelling it as Torres's method. |
| “We need an opportunity solution tree for abandoned bookings, but haven't interviewed anyone.” | Product outcome, proposed opportunities visibly unverified, alternative solutions and explicit assumption tests. |
| “Write up why we should run weekly workshops; no one has paid yet.” | A bounded argument with demand uncertainty and counterarguments; no manufactured proof or premature certainty. |
| “Group our ideas: memberships, Instagram, families, workshops.” | Mixed dimensions identified and regrouped without deleting ideas; no unsupported MECE claim. |

Also inspect whether an ordinary added thought remains editable, whether a method change preserves content and IDs, and whether labels describe actual relationship meanings. The runtime cannot certify these semantic judgements.
