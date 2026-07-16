import type { FC } from "react";
import styles from "../PreferencesModal.module.css";

// NOTICE.md is the canonical rights text; keep these paragraphs verbatim so the in-app notice grants the same rights.
const SourceAvailabilityRightsBlock: FC = () => (
	<details className={ styles.rightsDisclosure }>
		<summary className={ styles.rightsDisclosureSummary }>
			Copyright and Source Availability
		</summary>
		<div className={ styles.rightsBlock }>
		<p>
			Copyright © 2026–present Nicolò Zanetti. All rights reserved.
		</p>
		<p>
			This project is publicly source-available so users may inspect the source code for security concerns and review
			the
			project as a demonstration of the maintainer’s software development work. Users may download and copy the
			unmodified
			repository contents only as reasonably necessary to compile the software and run the resulting build solely for
			their
			own personal, non-commercial use.
		</p>
		<p>
			Official installers and binaries published by the copyright owner may also be downloaded and run as released.
			Neither
			source availability nor these limited permissions grant any right to modify, publish, distribute, redistribute,
			share,
			sublicense, mirror, host, commercialize, resell, repackage, reuse, or otherwise exploit this software, its source
			code,
			generated builds, or assets, or to provide the source code or a generated build to anyone else, without prior
			written
			permission.
		</p>
		<p>
			Users may create a repository fork and modify the repository contents only as reasonably necessary to prepare,
			test,
			and submit a contribution to Nimlat. They may make the unmodified repository contents and their proposed changes
			available through that fork only as necessary to submit and maintain a complete pull request to the official
			project
			repository. Modified builds may be run locally only for that contribution workflow. This permission does not allow
			an
			independent distribution, publication outside that contribution fork and pull request, commercialization, or use
			of
			the modified code or build for any other purpose.
		</p>
		<p>
			The software, source code, generated builds, and assets may not be used for artificial intelligence, machine
			learning, automated analysis, or model-training workflows of any kind. This includes, without limitation,
			dataset creation, fine-tuning, embeddings, vector indexes, benchmark or evaluation corpora, code-generation
			systems, scraping, mining, or model improvement workflows. Ordinary local dependency installation, build,
			type-checking, and validation tools used solely to exercise the personal-build permission above are allowed; this
			exception does not authorize any artificial intelligence or machine-learning use.
		</p>
		<p>
			By submitting a pull request, the contributor represents that the contribution is original or that they have all
			rights necessary to submit it, and grants the copyright owner a perpetual, worldwide, non-exclusive, irrevocable,
			royalty-free, transferable, and sublicensable license to use, reproduce, modify, distribute, publicly display,
			publicly perform, commercialize, and relicense the contribution as part of Nimlat or related project materials.
			The
			contributor retains ownership of their contribution. Contributions must respect the application architecture and
			quality requirements. The maintainer reserves the right to reject any pull request for any reason and without
			explanation.
		</p>
		</div>
	</details>
);

export default SourceAvailabilityRightsBlock;
