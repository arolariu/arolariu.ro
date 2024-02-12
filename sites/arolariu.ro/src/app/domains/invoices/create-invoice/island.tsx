/** @format */

"use client";

import InvoiceImagePreview from "@/components/domains/invoices/InvoiceImagePreview";
import AlertNotification from "@/components/domains/invoices/UploadAlertNotification";
import Link from "next/link";
import {useState} from "react";

/* eslint-disable no-unused-vars */
enum ImageStatus {
	NOT_UPLOADED,
	UPLOADED_TO_SITE,
	SENT_TO_STORAGE,
}
/* eslint-enable no-unused-vars */

type ImageState = {
	blob: Blob;
	identifier: string;
	status: ImageStatus;
};

const TopBarComponent = ({uploadIsDone}: {uploadIsDone: boolean}) => {
	return (
		<div className="flex flex-wrap mx-auto mb-20">
			<a
				className={`inline-flex w-1/2 items-center rounded-t border-b-2 py-3 font-medium tracking-wider sm:w-auto sm:justify-start sm:px-6
                    ${uploadIsDone == false ? " border-indigo-500 bg-gray-100 text-indigo-500 " : " border-gray-200 "}`}>
				<svg
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					className="w-5 h-5 mr-3"
					viewBox="0 0 24 24">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
				</svg>
				UPLOAD
			</a>
			<a
				className={`inline-flex w-1/2 items-center rounded-t border-b-2 py-3 font-medium tracking-wider sm:w-auto sm:justify-start sm:px-6
                    ${uploadIsDone == true ? " border-indigo-500 bg-gray-100 text-indigo-500 " : " border-gray-200 "}`}>
				<svg
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					className="w-5 h-5 mr-3"
					viewBox="0 0 24 24">
					<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
				</svg>
				ANALYSIS
			</a>
		</div>
	);
};

export default function RenderInvoiceScreen() {
	const [imageState, setImageState] = useState<ImageState>({
		blob: null as unknown as Blob,
		identifier: "",
		status: ImageStatus.NOT_UPLOADED,
	});

	const handleImageUpload = async (event: any) => {
		event.preventDefault();
		const image = event.target.files[0] as Blob;
		setImageState({...imageState, blob: image, status: ImageStatus.UPLOADED_TO_SITE});
	};

	const handleImageTransport = async () => {
		setImageState({...imageState, identifier: "replace-me", status: ImageStatus.SENT_TO_STORAGE});
	};

	// Return one of the following two possible scenes:
	// 1. Upload scene - where the user will be prompted to upload a new image.
	// 2. Analysis scene - where the will has the possibility to upload a new image or view the analysed image.
	// This return is based on the state variable.
	if (imageState.status == ImageStatus.NOT_UPLOADED) {
		return (
			<div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
				<TopBarComponent uploadIsDone={false} />
				<div className="container flex flex-col">
					<InvoiceImagePreview image={imageState.blob} />
					<div className="flex flex-col w-full text-center">
						<h1 className="mb-4 text-xl font-medium text-transparent title-font bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
							<strong>UPLOAD A PICTURE OF THE PAPER RECEIPT</strong>
						</h1>
						<p className="mx-auto text-base leading-relaxed lg:w-2/3">
							Carefully photograph or scan your paper receipt. <br />
							Attach the digital image from your device, here.
						</p>

						<form className="container my-5">
							<input
								type="file"
								name="file"
								className="w-full max-w-xs file-input file-input-bordered"
								title="Test"
								onChange={handleImageUpload}
							/>
							<button type="submit" title="Submit" className="hidden" />
						</form>
					</div>
				</div>
			</div>
		);
	} else if (imageState.status == ImageStatus.UPLOADED_TO_SITE) {
		return (
			<div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
				<TopBarComponent uploadIsDone={false} />
				<div className="container flex flex-col">
					<InvoiceImagePreview image={imageState.blob} />
					<div className="flex flex-col w-full text-center">
						<h1 className="mb-4 text-xl font-medium text-transparent title-font bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
							<strong>UPLOAD A PICTURE OF THE PAPER RECEIPT</strong>
						</h1>
						<p className="mx-auto text-base leading-relaxed lg:w-2/3">
							Carefully photograph or scan your paper receipt. <br />
							Attach the digital image from your device, here.
						</p>

						<form className="container my-5">
							<input
								type="file"
								name="file"
								className="w-full max-w-xs file-input file-input-bordered"
								title="Test"
								onChange={handleImageUpload}
							/>
							<button type="submit" title="Submit" className="hidden" />
						</form>
					</div>

					{AlertNotification({imageBlob: imageState.blob}) == null ? (
						<div className="container flex flex-col">
							<button className="mx-auto mt-4 btn btn-primary" type="button" onClick={() => handleImageTransport()}>
								Continue to the next step
							</button>
							<button
								className="mx-auto mt-4 btn btn-secondary"
								type="button"
								onClick={() =>
									setImageState({...imageState, blob: null!, identifier: "", status: ImageStatus.NOT_UPLOADED})
								}>
								Clear image
							</button>
						</div>
					) : (
						<AlertNotification imageBlob={imageState.blob} />
					)}
				</div>
			</div>
		);
	} else if (imageState.status == ImageStatus.SENT_TO_STORAGE) {
		return (
			<div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
				<TopBarComponent uploadIsDone={true} />
				<section className="flex flex-col items-center mx-auto">
					<div className="w-full px-4 mb-6 sm:p-4">
						<h1 className="mb-2 text-3xl font-medium text-center text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
							Invoice was uploaded successfully! 🪄
						</h1>
						<p className="leading-relaxed text-center">
							Head over to the generated invoice page to view the full details of the analysis. <br />
							Please bear in mind that the analysis may take up to 3 minutes to complete.
						</p>
						<br />
						<p className="leading-relaxed text-center">
							Thank you for using our service! 🎊🎊
							<br />
							<small>
								Invoice identifier: <em>{imageState.identifier}</em>
							</small>
						</p>
					</div>
					<div className="flex flex-row items-center justify-center w-full gap-4 p-4 sm:w-1/2 lg:w-1/4">
						<Link
							href="./create-invoice"
							className="btn btn-secondary"
							onClick={() =>
								setImageState({...imageState, blob: null!, identifier: "", status: ImageStatus.NOT_UPLOADED})
							}>
							Upload another invoice
						</Link>
						<Link href={`./view-invoice/${imageState.identifier}`} className="btn btn-primary">
							View analysis
						</Link>
					</div>
				</section>
			</div>
		);
	}
}
