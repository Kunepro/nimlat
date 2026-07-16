import type { ExternalTrackingProvider } from "@nimlat/types/external-tracking";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

interface UseExternalTrackingCredentialZapResult {
	openProviders: ExternalTrackingProvider[];
	zappedProvider: ExternalTrackingProvider | null;
	setOpenProviders: (providers: ExternalTrackingProvider[]) => void;
	triggerCredentialZap: (provider: ExternalTrackingProvider) => void;
}

// Runs the short credential-collapse animation after a successful credential save.
export function useExternalTrackingCredentialZap(): UseExternalTrackingCredentialZapResult {
	const [ openProviders, setOpenProviders ]   = useState<ExternalTrackingProvider[]>([]);
	const [ zappedProvider, setZappedProvider ] = useState<ExternalTrackingProvider | null>(null);
	const zapTimeoutRef                         = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			if (zapTimeoutRef.current) {
				clearTimeout(zapTimeoutRef.current);
			}
		},
		[],
	);

	const triggerCredentialZap = useCallback(
		(provider: ExternalTrackingProvider) => {
			setZappedProvider(provider);
			setOpenProviders(prevProviders => prevProviders.filter(openProvider => openProvider !== provider));
			if (zapTimeoutRef.current) {
				clearTimeout(zapTimeoutRef.current);
			}
			zapTimeoutRef.current = setTimeout(
				() => setZappedProvider(null),
				500,
			);
		},
		[],
	);

	return {
		openProviders,
		setOpenProviders,
		triggerCredentialZap,
		zappedProvider,
	};
}
