// file: src/carriers/aymakan/types.ts
/**
 * Aymakan Raw API Types
 * These directly mirror the Aymakan API request/response formats.
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface AymakanNationalAddressRequest {
    short_code: string;
    building_number?: string;
    street_name?: string;
    district?: string;
    city?: string;
    post_code?: string;
    additional_number?: string;
}

export interface AymakanInternationalMetadata {
    document_id?: number;
    tax_identification_number?: string;
    invoice_number?: string;
    invoice_date?: string;
}

export interface AymakanCreateShipmentRequest {
    requested_by: string;
    declared_value: number;
    declared_value_currency?: string;
    reference?: string;
    customer_tracking?: string;
    service_type?: string;
    is_cod?: 0 | 1;
    cod_amount?: number;
    fulfilment_customer_name?: string;
    currency?: string;
    delivery_name: string;
    delivery_email?: string;
    delivery_city: string;
    delivery_address: string;
    delivery_neighbourhood?: string;
    delivery_postcode?: string;
    delivery_country: string;
    delivery_phone: string;
    delivery_description?: string;
    delivery_national_address?: AymakanNationalAddressRequest;
    collection_name: string;
    collection_email?: string;
    collection_city: string;
    collection_address: string;
    collection_neighbourhood?: string;
    collection_postcode?: string;
    collection_country: string;
    collection_phone: string;
    collection_description?: string;
    collection_national_address?: AymakanNationalAddressRequest;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    pieces: number;
    items_count?: number;
    is_insured?: 0 | 1;
    international_metadata?: AymakanInternationalMetadata;
}

export interface AymakanPickupRequest {
    reference?: string;
    pickup_date: string;
    time_slot: string;
    city: string;
    contact_name: string;
    contact_phone: string;
    address: string;
    shipments: number;
}

export interface AymakanAddressRequest {
    title: string;
    name: string;
    email: string;
    city: string;
    address: string;
    neighbourhood: string;
    postcode: string;
    phone: string;
    description: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface AymakanShipmentResponse {
    reference: string | null;
    tracking_number: string;
    customer_tracking: string | null;
    customer_name: string;
    requested_by: string;
    price_set_amount: number | null;
    price_set_amount_incl_tax: number | null;
    tax_amount: number | null;
    tax_rate: number | null;
    cod_amount: string | number | null;
    declared_value: number;
    declared_value_currency: string;
    currency: string;
    delivery_name: string;
    delivery_email: string | null;
    delivery_city: string;
    delivery_address: string;
    delivery_neighbourhood: string | null;
    delivery_postcode: string | null;
    delivery_country: string;
    delivery_phone: string;
    delivery_description: string | null;
    collection_name: string;
    collection_email: string | null;
    collection_city: string;
    collection_address: string;
    collection_region: string | null;
    collection_postcode: string | null;
    collection_country: string;
    collection_phone: string;
    collection_description: string | null;
    submission_date: string;
    pickup_date: string | null;
    received_at: string | null;
    delivery_date: string | null;
    weight: number;
    pieces: number;
    items_count: number;
    status: string;
    status_label: string;
    created_at: string;
    is_reverse_pickup: 0 | 1;
    label: string;
    pdf_label: string;
}

export interface AymakanCreateShipmentResponse {
    success: boolean;
    shipping: AymakanShipmentResponse;
}

export interface AymakanTrackingEvent {
    status_code: string;
    description: string;
    description_ar: string | null;
    created_at: string;
}

export interface AymakanTrackShipmentData {
    reference: string | null;
    tracking_number: string;
    customer_tracking: string | null;
    customer_name: string;
    requested_by: string;
    cod_amount: string | null;
    declared_value: number | null;
    declared_value_currency: string | null;
    currency: string;
    delivery_name: string;
    delivery_email: string | null;
    delivery_city: string;
    delivery_address: string;
    delivery_region: string | null;
    delivery_postcode: string | null;
    delivery_country: string;
    delivery_phone: string;
    delivery_description: string | null;
    collection_name: string;
    collection_email: string | null;
    collection_city: string;
    collection_address: string;
    collection_region: string | null;
    collection_postcode: string | null;
    collection_country: string;
    collection_phone: string;
    collection_description: string | null;
    submission_date: string;
    pickup_date: string | null;
    received_at: string | null;
    delivery_date: string | null;
    weight: string;
    pieces: number;
    items_count: number;
    status: string;
    status_label: string;
    reason_en: string | null;
    reason_ar: string | null;
    created_at: string;
    id_customer: number;
    is_reverse_pickup: 0 | 1;
    tracking_info: AymakanTrackingEvent[];
}

export interface AymakanTrackResponse {
    success: boolean;
    data: {
        shipments: AymakanTrackShipmentData[];
    };
}

export interface AymakanCity {
    city_en: string;
    city_ar: string;
}

export interface AymakanCitiesResponse {
    success: boolean;
    data: {
        cities: AymakanCity[];
    };
}

export interface AymakanPickupResponse {
    success: boolean;
    message: string;
    data: {
        id: number;
        customer_id: number;
        contact_name: string;
        contact_phone: string;
        shipments: number;
        time_slot: string;
        pickup_date: string;
        address: string;
        lat_long: string;
        status: string;
        city: string;
        warehouse_id: number;
        warehouse_name: string;
        reference: string | null;
        created_at: string;
        updated_at: string;
    };
}

export interface AymakanAddressResponse {
    success: number;
    data: {
        address: {
            id: number;
            title: string;
            name: string;
            email: string;
            city: string;
            address: string;
            postcode: string;
            neighbourhood: string;
            phone: string;
            country: string;
            description: string;
        };
    };
}

export interface AymakanCancelResponse {
    success: boolean;
    shipping?: {
        reference: string | null;
        tracking_number: string;
        status: string;
    };
}

export interface AymakanWebhookPayload {
    tracking_number: string;
    reference: string | null;
    status: string;
    status_label: string;
    reason_code: string | null;
    reason_en: string | null;
    date_time: string;
    event: 'status_update' | 'weight_update';
    requested_delivery_date: string | null;
    delivery_name: string;
    delivery_email: string | null;
    delivery_city: string;
    delivery_address: string;
    delivery_postcode: string | null;
    delivery_country: string;
    delivery_phone: string;
    delivery_description: string | null;
    delivery_neighbourhood: string | null;
    delivery_date: string | null;
    collection_name: string;
    collection_email: string | null;
    collection_city: string;
    collection_address: string;
    collection_neighbourhood: string | null;
    is_reverse_pickup: 0 | 1;
    pickup_date: string | null;
    received_at: string | null;
    cod_amount: string | null;
    pieces: number;
    id_customer: number;
    weight: string;
    payment_method: string | null;
    customer_name: string;
    tracking_info: AymakanTrackingEvent[];
}

export interface AymakanErrorResponse {
    error?: boolean;
    message?: string;
    errors?: Record<string, string[]>;
    response?: string;
}
