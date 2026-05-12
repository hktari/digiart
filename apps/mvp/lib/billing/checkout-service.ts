import { type PeechoAddressDetails, peechoClient } from "@/lib/peecho/client";

/**
 * Updates the order address when collector commits/subscribes.
 * Called during Stripe checkout completion.
 */
export async function updateOrderAddressForCommit(
  peechoOrderId: string,
  addressDetails: PeechoAddressDetails,
): Promise<{ success: boolean; message?: string }> {
  return peechoClient.updateOrderAddress(
    parseInt(peechoOrderId, 10),
    addressDetails,
  );
}

/**
 * Attaches PDF content to order at cycle lock.
 * Called after PDF generation is complete.
 */
export async function attachFilesToOrder(
  peechoOrderId: string,
  itemReference: string,
  contentUrl: string,
  pageCount: number,
): Promise<{ success: boolean }> {
  return peechoClient.attachOrderFiles(
    parseInt(peechoOrderId, 10),
    itemReference,
    {
      content_url: contentUrl,
      content_width: 210, // A4 width in mm
      content_height: 297, // A4 height in mm
      number_of_pages: pageCount,
    },
  );
}
