import {useZustandStore} from "@/hooks/stateStore";
import Image from "next/image";
import {useRef, useState} from "react";

// TODO: fix the preview zoom having weird behavior when the mouse hovers near the edges of the image.

export const ViewInvoiceImageModal = () => {
	const modalReference = useRef<HTMLDialogElement | null>(null);
	const invoice = useZustandStore((state) => state.selectedInvoice);
	const [isFrozen, setIsFrozen] = useState<boolean>(false);
	const [zoomStyle, setZoomStyle] = useState({
		transform: "scale(1)",
		transformOrigin: "0 0",
	});

	const handleMouseMove = (event: any) => {
		if (isFrozen) return;

		const containerRect = event.currentTarget.getBoundingClientRect();
		const cursorX = event.clientX - containerRect.left;
		const cursorY = event.clientY - containerRect.top;

		// Calculate normalized cursor position within the image
		const normalizedX = cursorX / containerRect.width;
		const normalizedY = cursorY / containerRect.height;

		// Apply bounds to avoid extreme zoom near edges
		const boundNormalizedX = Math.min(Math.max(normalizedX, 0.05), 0.95);
		const boundNormalizedY = Math.min(Math.max(normalizedY, 0.05), 0.95);

		// Calculate new transform origin based on bounds
		const newTransformOrigin = `${boundNormalizedX * 100}% ${boundNormalizedY * 100}%`;

		setZoomStyle({
			transform: "scale(2)",
			transformOrigin: newTransformOrigin,
		});
	};

	const handleMouseLeave = () => {
		if (!isFrozen) {
			setZoomStyle({
				transform: "scale(1)",
				transformOrigin: "0 0",
			});
		}
	};

	const handleImageClick = (event: any) => {
		if (event.target.tagName === "IMG") {
			setIsFrozen(!isFrozen);
		} else if (event.target.tagName === "DIALOG") {
			modalReference.current?.close();
			setIsFrozen(false);
		}
	};

	return (
		<div className="flex flex-wrap justify-center mx-auto mt-4">
			<button className="btn btn-secondary" onClick={() => modalReference.current?.showModal()}>
				Preview uploaded receipt photo
			</button>
			<dialog
				id="invoiceModal"
				ref={modalReference}
				className="modal modal-bottom backdrop-blur-sm sm:modal-middle"
				onClick={handleImageClick}>
				<form method="dialog" className="modal-box">
					<center className="mb-2 font-black">Invoice: {invoice.id}</center>
					<Image
						alt="Invoice photo"
						style={{
							transition: "transform 0.3s ease, transform-origin 0s",
							...zoomStyle,
						}}
						src={`${invoice != null ? invoice.photoLocation : "https://dummyimage.com/400x400"}`}
						width={800}
						height={800}
						onMouseMove={handleMouseMove}
						onMouseLeave={handleMouseLeave}
						onClick={handleImageClick}
					/>
					<div className="modal-action">
						<button className="mx-auto btn btn-secondary">Close invoice preview</button>
					</div>
				</form>
			</dialog>
		</div>
	);
};
