import { useEffect, useState } from "react";
import {
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
} from "react-icons/fa";

import Sidebar from "../components/sidebar";
import VendorSidebar from "../components/VendorSidebar";

import { getVendorInvoices } from "../services/api";

import "../styles/Invoices.css";

export default function Invoices() {
  const [data, setData] = useState({
    invoices: [],
    summary: {},
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const isVendor =
    user.role === "Vendor" ||
    user.role_name === "Vendor";

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await getVendorInvoices();

        setData({
          invoices: result.invoices || [],
          summary: result.summary || {},
        });
      } catch (err) {
        console.error("Invoice page error:", err);
        setError(
          err.message || "Unable to load invoices"
        );
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const summary = data.summary || {};

  const formatAmount = (amount) => {
    return `₹${Number(amount || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getStatusClass = (status) => {
    const value = String(
      status || "Pending"
    ).toLowerCase();

    if (
      value === "paid" ||
      value === "completed"
    ) {
      return "invoice-status paid";
    }

    if (
      value === "pending" ||
      value === "unpaid"
    ) {
      return "invoice-status pending";
    }

    if (
      value === "overdue" ||
      value === "failed"
    ) {
      return "invoice-status overdue";
    }

    return "invoice-status";
  };

  return (
    <div className="invoices-page">

      {isVendor ? <VendorSidebar /> : <Sidebar />}

      <main className="invoices-content">

        <div className="invoices-header">
          <div>
            <h1>Invoices</h1>
            <p>
              View and track your invoices,
              payments and outstanding amounts.
            </p>
          </div>
        </div>

        {error && (
          <div className="invoice-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="invoice-loading">
            Loading invoices...
          </div>
        ) : (
          <>
            <section className="invoice-summary">

              <div className="invoice-summary-card">
                <div className="invoice-summary-icon">
                  <FaFileInvoiceDollar />
                </div>

                <div>
                  <span>Total Invoices</span>
                  <strong>
                    {summary.total_invoices || 0}
                  </strong>
                </div>
              </div>

              <div className="invoice-summary-card">
                <div className="invoice-summary-icon">
                  <FaMoneyBillWave />
                </div>

                <div>
                  <span>Total Invoiced</span>
                  <strong>
                    {formatAmount(
                      summary.total_invoiced
                    )}
                  </strong>
                </div>
              </div>

              <div className="invoice-summary-card">
                <div className="invoice-summary-icon">
                  <FaCheckCircle />
                </div>

                <div>
                  <span>Total Paid</span>
                  <strong>
                    {formatAmount(
                      summary.total_paid
                    )}
                  </strong>
                </div>
              </div>

              <div className="invoice-summary-card">
                <div className="invoice-summary-icon">
                  <FaClock />
                </div>

                <div>
                  <span>Pending Amount</span>
                  <strong>
                    {formatAmount(
                      summary.pending_amount
                    )}
                  </strong>
                </div>
              </div>

            </section>

            <section className="invoice-table-card">

              <div className="invoice-table-header">
                <div>
                  <h2>Invoice History</h2>
                  <p>
                    Your vendor invoice records
                  </p>
                </div>
              </div>

              {data.invoices.length === 0 ? (
                <div className="invoice-empty">
                  <FaFileInvoiceDollar />
                  <h3>No invoices found</h3>
                  <p>
                    There are currently no invoices
                    associated with your vendor account.
                  </p>
                </div>
              ) : (
                <div className="invoice-table-wrapper">

                  <table className="invoice-table">

                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Purchase Order</th>
                        <th>Invoice Date</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Payment Status</th>
                        <th>Payment Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.invoices.map(
                        (invoice) => (
                          <tr
                            key={
                              invoice.invoice_id
                            }
                          >
                            <td>
                              <strong>
                                {invoice.invoice_number ||
                                  `INV-${invoice.invoice_id}`}
                              </strong>
                            </td>

                            <td>
                              PO-
                              {invoice.po_id}
                            </td>

                            <td>
                              {formatDate(
                                invoice.invoice_date
                              )}
                            </td>

                            <td>
                              {formatDate(
                                invoice.due_date
                              )}
                            </td>

                            <td>
                              <strong>
                                {formatAmount(
                                  invoice.invoice_amount
                                )}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={getStatusClass(
                                  invoice.payment_status
                                )}
                              >
                                {invoice.payment_status ||
                                  "Pending"}
                              </span>
                            </td>

                            <td>
                              {formatDate(
                                invoice.payment_date
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>

                  </table>

                </div>
              )}

            </section>
          </>
        )}

      </main>
    </div>
  );
}