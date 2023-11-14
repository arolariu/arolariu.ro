"use client";

import {getSession} from "next-auth/react";
import {useState} from "react";
import CreateInvoiceCallToAction from "./CreateInvoiceCallToAction";
import CreateInvoiceImagePreview from "./CreateInvoiceImagePreview";
import CreateInvoiceNextStepsButtons from "./CreateInvoiceNextStepsButtons";
import CreateInvoicePhotoExtensionAlert from "./CreateInvoicePhotoExtensionAlert";

interface Props {
	// eslint-disable-next-line no-unused-vars
	setCurrentStep: (step: number) => void;
	// eslint-disable-next-line no-unused-vars
	setInvoiceIdentifier: (identifier: string) => void;
}

export default function UploadInvoicePhoto({setCurrentStep, setInvoiceIdentifier}: Props) {
	const [imageBlob, setImageBlob] = useState<Blob>(null!);
	const [imageError, setImageError] = useState<boolean>(false);

	const styledAlert = " opacity-100 "; // whitespace acts as CSS guards
	const unstyledAlert = " h-0 w-0 overflow-hidden bg-black opacity-0 ";
	const isStyledAlert = imageError ? styledAlert : unstyledAlert;

	const handlePhotoUpload = async (event: any) => {
		event.preventDefault();
		const photo = event.target.files[0] as Blob;
		const allowedFormats = ["image/jpeg", "image/png", "application/pdf"];
		if (allowedFormats.includes(photo.type)) {
			setImageBlob(photo);
			setImageError(false);
		} else {
			setImageError(true);
			setTimeout(() => {
				setImageError(false);
			}, 7500);
		}
	};

	const sendInvoiceToBackend = async (image: Blob) => {
		const session = await getSession();
		const imageBuffer = await image.arrayBuffer();
		const base64Image = Buffer.from(imageBuffer).toString("base64");
		const dataUrl = `data:${image.type};base64,${base64Image}`;

		const jsonPayload = {
			invoiceBase64Photo: dataUrl,
			additionalMetadata: [
				{
					key: "Username",
					value: session!.user?.name,
				},
				{
					key: "Email",
					value: session!.user?.email,
				},
			],
		};

		const response = await fetch("https://api.arolariu.ro/rest/invoices", {
			method: "POST",
			body: JSON.stringify(jsonPayload),
			headers: {
				"Content-Type": "application/json",
			},
		});

		const json = await response.json();
		const id = json.id;
		setInvoiceIdentifier(id);
		setCurrentStep(2);
		return json;
	};

	return (
		<div className="container flex flex-col">
			<CreateInvoiceImagePreview image={imageBlob} />
			<CreateInvoiceCallToAction handlePhotoUpload={handlePhotoUpload} />
			<CreateInvoiceNextStepsButtons
				imageBlob={imageBlob}
				sendInvoiceToBackend={sendInvoiceToBackend}
				setImageBlob={setImageBlob}
			/>
			<CreateInvoicePhotoExtensionAlert isStyledAlert={isStyledAlert} />
		</div>
	);
}
