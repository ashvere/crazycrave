type Props = {
  barangayMap: Record<string, number>;
  scheduleMinDate: string;
};

export function HomeMenuModal({ barangayMap, scheduleMinDate }: Props) {
  const barangayJson = JSON.stringify(barangayMap).replace(/</g, "\\u003c");

  return (
    <>
      <script
        id="kk-home-barangay-data"
        type="application/json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: barangayJson }}
      />

      <div
        className="modal fade"
        id="kkHomeMenuModal"
        tabIndex={-1}
        aria-labelledby="kkHomeMenuModalLabel"
        aria-hidden="true"
        data-img-base="/images/menus/"
        data-restaurant-href="/restaurant"
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable kk-home-menu-dialog">
          <div className="modal-content home-menu-modal position-relative">
            <button
              type="button"
              className="kk-modal-dismiss home-menu-modal__dismiss"
              data-bs-dismiss="modal"
              aria-label="Dismiss dialog"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
            <div className="modal-header border-0 pb-0 home-menu-modal__head">
              <div className="min-w-0 pe-2 flex-grow-1">
                <p
                  className="text-muted small mb-1 text-break"
                  id="kkHomeMenuShopLine"
                />
                <h2
                  className="modal-title fw-bold text-break"
                  id="kkHomeMenuModalLabel"
                />
              </div>
            </div>
            <div className="modal-body pt-2">
              <div id="kkHomeMenuStep1" className="kk-home-menu-step">
                <div className="row g-3 align-items-start">
                  <div className="col-sm-5">
                    <img
                      src=""
                      alt=""
                      className="w-100 rounded-3 shadow-sm home-menu-modal__img"
                      id="kkHomeMenuImg"
                      width={400}
                      height={300}
                    />
                  </div>
                  <div className="col-sm-7">
                    <p className="home-menu-modal__price mb-3" id="kkHomeMenuPriceLine" />
                    <div
                      id="kkHomeMenuDetailsWrap"
                      className="home-menu-modal__details d-none"
                    >
                      <h3 className="h6 fw-semibold mb-2">Ingredients &amp; details</h3>
                      <p className="text-muted mb-0" id="kkHomeMenuDesc" />
                    </div>
                    <button
                      type="button"
                      className="btn btn-link px-0 d-none mt-2"
                      id="kkHomeMenuShowDetails"
                    >
                      Show ingredients &amp; details
                    </button>
                    <div
                      id="kkHomeMenuStep1Actions"
                      className="d-none mt-3 d-flex flex-column flex-sm-row flex-wrap gap-2"
                    >
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-grow-1"
                        id="kkHomeMenuStep1Order"
                      >
                        Order now
                      </button>
                      <button
                        type="button"
                        className="btn btn-dark flex-grow-1"
                        id="kkHomeMenuStep1Add"
                      >
                        <i className="bi bi-cart-plus me-1" aria-hidden="true" />
                        Add to cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div id="kkHomeMenuStep2" className="kk-home-menu-step d-none">
                <div className="kk-home-menu-checkout-lite border rounded-3 p-3 mb-3 bg-body-secondary">
                  <h4 className="h6 fw-semibold mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-receipt-cutoff" aria-hidden="true" />
                    <span>Your cart (this item)</span>
                  </h4>
                  <div className="table-responsive">
                    <table className="table table-sm table-borderless mb-2">
                      <thead className="table-light">
                        <tr>
                          <th>Item</th>
                          <th className="text-end">Qty</th>
                          <th className="text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody id="kkMiniCartBody" />
                    </table>
                  </div>
                  <p className="mb-1 small">
                    <strong>Food Total:</strong> ₱<span id="kkMiniFoodTotal">0.00</span>
                  </p>
                  <p className="mb-1 small">
                    <strong>Rider Fee:</strong> ₱<span id="kkMiniRiderFee">0.00</span>
                  </p>
                  <p className="mb-0 small">
                    <strong>Grand Total:</strong> ₱
                    <span id="kkMiniGrandTotal">0.00</span>
                  </p>
                </div>

                <h3 className="h6 fw-semibold mb-3 kk-home-menu-step2__heading">
                  Pick up or delivery
                </h3>
                <div className="row g-2 mb-3" role="group" aria-label="Fulfillment">
                  <div className="col-6">
                    <input
                      type="radio"
                      className="btn-check"
                      name="kk_order_fulfillment"
                      id="kkOrderFulDelivery"
                      value="delivery"
                      defaultChecked
                      autoComplete="off"
                    />
                    <label
                      className="btn btn-outline-secondary w-100 h-100 py-2 d-flex align-items-center justify-content-center text-center"
                      htmlFor="kkOrderFulDelivery"
                    >
                      Delivery
                    </label>
                  </div>
                  <div className="col-6">
                    <input
                      type="radio"
                      className="btn-check"
                      name="kk_order_fulfillment"
                      id="kkOrderFulPickup"
                      value="pickup"
                      autoComplete="off"
                    />
                    <label
                      className="btn btn-outline-secondary w-100 h-100 py-2 d-flex align-items-center justify-content-center text-center"
                      htmlFor="kkOrderFulPickup"
                    >
                      Pick up
                    </label>
                  </div>
                </div>

                <div className="mb-3 position-relative" id="kkModalBarangayWrap">
                  <label
                    className="d-flex flex-wrap align-items-center gap-1 gap-sm-2 form-label fw-semibold mb-1 text-break"
                    htmlFor="kkModalBarangay"
                  >
                    <i className="bi bi-geo-alt flex-shrink-0" aria-hidden="true" />
                    <span>Barangay (Pototan, Iloilo only)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="kkModalBarangay"
                    placeholder="Type your barangay..."
                    autoComplete="off"
                  />
                  <div
                    id="kkModalSuggestions"
                    className="list-group position-absolute w-100 shadow-sm rounded mt-1"
                    style={{ zIndex: 1060, maxHeight: "12rem", overflowY: "auto" }}
                  />
                </div>

                <div className="mb-3" id="kkOrderAddressBlock">
                  <label
                    className="d-flex flex-wrap align-items-center gap-1 gap-sm-2 form-label fw-semibold mb-1 text-break"
                    htmlFor="kkOrderStreet"
                  >
                    <i className="bi bi-house-door flex-shrink-0" aria-hidden="true" />
                    <span id="kkOrderStreetLabel">Street / landmark</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="kkOrderStreet"
                    rows={2}
                    placeholder="House number, street, landmark…"
                  />
                </div>

                <div className="mb-3">
                  <label
                    className="d-flex flex-wrap align-items-center gap-1 gap-sm-2 form-label fw-semibold mb-1 text-break"
                    htmlFor="kkOrderTime"
                  >
                    <i className="bi bi-clock flex-shrink-0" aria-hidden="true" />
                    <span>Preferred pickup / delivery time</span>
                  </label>
                  <input
                    type="time"
                    className="form-control"
                    id="kkOrderTime"
                    defaultValue="12:00"
                  />
                </div>

                <div className="mb-3">
                  <label
                    className="d-flex flex-wrap align-items-center gap-1 gap-sm-2 form-label fw-semibold mb-1 text-break"
                    htmlFor="kkOrderNotes"
                  >
                    <i className="bi bi-chat-left-text flex-shrink-0" aria-hidden="true" />
                    <span>Order notes</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="kkOrderNotes"
                    rows={2}
                    placeholder="Optional"
                  />
                </div>

                <div className="mb-3">
                  <label className="fw-bold d-flex flex-wrap align-items-center gap-1 gap-sm-2 mb-2 text-break">
                    <i className="bi bi-truck flex-shrink-0" aria-hidden="true" />
                    <span>Delivery options</span>
                  </label>
                  <div className="delivery-option active">
                    <input
                      type="radio"
                      name="kk_delivery_option"
                      value="standard"
                      id="kkDelStandard"
                      defaultChecked
                    />
                    <label htmlFor="kkDelStandard">
                      Standard
                      <small className="text-muted d-block">20 – 35 mins</small>
                    </label>
                  </div>
                  <div className="delivery-option">
                    <input
                      type="radio"
                      name="kk_delivery_option"
                      value="priority"
                      id="kkDelPriority"
                    />
                    <label htmlFor="kkDelPriority">
                      Priority
                      <small className="text-muted d-block">
                        40 – 55 mins · + ₱30 rider fee
                      </small>
                      <span className="badge bg-success mt-1">Available</span>
                    </label>
                  </div>
                  <div className="delivery-option">
                    <input
                      type="radio"
                      name="kk_delivery_option"
                      value="scheduled"
                      id="kkDelScheduled"
                    />
                    <label htmlFor="kkDelScheduled">
                      Scheduled
                      <small className="text-muted d-block">Choose date &amp; time below</small>
                      <span className="badge bg-success mt-1">Available</span>
                    </label>
                  </div>
                  <div className="kk-modal-scheduled mt-2 d-none" id="kkModalScheduledFields">
                    <div className="row g-2">
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold" htmlFor="kkScheduleDate">
                          Delivery date
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          id="kkScheduleDate"
                          min={scheduleMinDate}
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold" htmlFor="kkScheduleTime">
                          Delivery time
                        </label>
                        <input
                          type="time"
                          className="form-control"
                          id="kkScheduleTime"
                          defaultValue="12:00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-0">
                  <label className="fw-bold d-flex flex-wrap align-items-center gap-1 gap-sm-2 mb-2 text-break">
                    <i className="bi bi-credit-card flex-shrink-0" aria-hidden="true" />
                    <span>Payment method</span>
                  </label>
                  <div className="payment-option active">
                    <input type="radio" name="kk_order_payment" value="cod" id="kkPayCod" defaultChecked />
                    <label htmlFor="kkPayCod" className="d-inline-flex align-items-center flex-wrap gap-2 mb-0">
                      <i className="bi bi-cash-coin fs-5 text-success" aria-hidden="true" />
                      <span>Cash on delivery</span>
                      <span className="badge bg-success">Available</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer border-0 flex-column flex-sm-row flex-wrap align-items-stretch align-items-sm-center gap-2 pt-0 w-100">
              <a
                href="/restaurant"
                className="btn btn-outline-secondary order-1 order-sm-0 w-100 w-sm-auto text-center"
                id="kkHomeMenuShopLink"
              >
                View full menu
              </a>
              <div className="ms-sm-auto d-flex flex-column flex-sm-row flex-wrap gap-2 align-items-stretch align-items-sm-center w-100 w-sm-auto order-0 order-sm-1">
                <button
                  type="button"
                  className="btn btn-outline-secondary d-none w-100 w-sm-auto"
                  id="kkHomeMenuBtnBack"
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-dark d-none w-100 w-sm-auto"
                  id="kkHomeMenuBtnContinue"
                >
                  Continue
                </button>
                <form
                  method="POST"
                  id="kkHomeMenuAddForm"
                  action="/api/cart/add"
                  className="d-flex flex-column flex-sm-row gap-2 align-items-stretch align-items-sm-center w-100 w-sm-auto"
                >
                  <input type="hidden" name="menu_id" id="kkHomeMenuInputMenuId" defaultValue="" />
                  <input type="hidden" name="shop_id" id="kkHomeMenuInputShopId" defaultValue="" />
                  <input type="hidden" name="prefill_flow" id="kkPrefillFlow" defaultValue="" />
                  <input type="hidden" name="prefill_fulfillment" id="kkPrefillFulfillment" defaultValue="delivery" />
                  <input type="hidden" name="prefill_address" id="kkPrefillAddress" defaultValue="" />
                  <input type="hidden" name="prefill_time" id="kkPrefillTime" defaultValue="" />
                  <input type="hidden" name="prefill_payment" id="kkPrefillPayment" defaultValue="cod" />
                  <input type="hidden" name="prefill_notes" id="kkPrefillNotes" defaultValue="" />
                  <input type="hidden" name="prefill_barangay" id="kkPrefillBarangay" defaultValue="" />
                  <input type="hidden" name="prefill_delivery_option" id="kkPrefillDeliveryOption" defaultValue="standard" />
                  <input type="hidden" name="prefill_schedule_date" id="kkPrefillScheduleDate" defaultValue="" />
                  <input type="hidden" name="prefill_schedule_time" id="kkPrefillScheduleTime" defaultValue="" />
                  <input type="hidden" name="prefill_distance_km" id="kkPrefillDistanceKm" defaultValue="" />
                  <input type="hidden" name="prefill_rider_fee" id="kkPrefillRiderFee" defaultValue="" />
                  <button type="submit" className="btn btn-dark w-100 w-sm-auto" id="kkHomeMenuBtnSubmit">
                    <i className="bi bi-cart-plus me-1" aria-hidden="true" />
                    Add to cart
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
