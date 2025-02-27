"use client";
import { useEffect } from "react";
import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import _ from "lodash";
import * as XLSX from "xlsx";
import { TooltipProps } from "recharts";


const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
];


const Dashboard = () => {

  interface Vendor {
    vendorName: string;
    totalAmount: number;
  }
  
  interface ProductCategory {
    name: string;
    value: number;
  }
  
  interface PurchaseDistribution {
    name: string;
    value: number;
  }
  
  interface GSTRegistrationType {
    type: string;
    count: number;
  }
  
  interface PurchaseTrend {
    month: string;
    totalAmount: number;
  }
  
  interface DashboardData {
    topVendors: Vendor[];
    productCategories: ProductCategory[];
    purchaseValueDistribution: PurchaseDistribution[];
    purchaseQtyDistribution: PurchaseDistribution[];
    gstRegistrationTypes: GSTRegistrationType[];
    purchaseTrends: PurchaseTrend[];
  }
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    topVendors: [],
    productCategories: [],
    purchaseValueDistribution: [],
    purchaseQtyDistribution: [],
    gstRegistrationTypes: [],
    purchaseTrends: []
  });
  

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  // const handleFileUpload = (event) => {
  //   const file = event.target.files[0];
  //   if (!file) return;

  //   setLoading(true);
  //   setError(null);
  //   setFileName(file.name);

  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     try {
  //       const data = new Uint8Array(e.target.result);
  //       const workbook = XLSX.read(data, {
  //         cellStyles: true,
  //         cellFormulas: true,
  //         cellDates: true,
  //         cellNF: true,
  //         sheetStubs: true
  //       });

  //       const sheet = workbook.Sheets[workbook.SheetNames[0]];
  //       const jsonData = XLSX.utils.sheet_to_json(sheet, {raw: false, dateNF: 'yyyy-mm-dd'});

  //       // Process data
  //       const processedData = processLedgerData(jsonData);
  //       setDashboardData(processedData);
  //     } catch (error) {
  //       console.error('Error processing Excel file:', error);
  //       setError('Failed to process the Excel file. Please make sure it has the expected format with columns like Party Name, Amount, Actual Qty, etc.');
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   reader.onerror = () => {
  //     setError('Failed to read the file. Please try again.');
  //     setLoading(false);
  //   };

  //   reader.readAsArrayBuffer(file);
  // };

  const handleFileUpload = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/excelsheet/Merged_Invoice_Ledger_Stock.xlsx"
      ); // Adjust path if needed
      if (!response.ok) {
        throw new Error("Failed to fetch the file.");
      }

      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {
            cellStyles: true,
            cellFormula: true,
            cellDates: true,
            cellNF: true,
            sheetStubs: true,
          });

          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(sheet, {
            raw: false,
            dateNF: "yyyy-mm-dd",
          });

          // Process data
          const processedData: any = processLedgerData(jsonData);
          setDashboardData(processedData);
        } catch (error) {
          console.error("Error processing Excel file:", error);
          setError(
            "Failed to process the Excel file. Please make sure it has the expected format."
          );
        } finally {
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(blob);
    } catch (error) {
      console.error(error);
      setError("Failed to load the default file.");
      setLoading(false);
    }
  };

  // Call this function when the component mounts
  useEffect(() => {
    handleFileUpload();
  }, []);

  // Function to process ledger data
  const processLedgerData = (jsonData: any) => {
    // Parse numbers and clean data
    const parseAmount = (value: any) => {
      if (typeof value === "string") {
        return parseFloat(value.replace(/,/g, ""));
      } else if (typeof value === "number") {
        return value;
      }
      return 0;
    };

    const cleanData = jsonData.map((row: any) => {
      return {
        ...row,
        Date: row.Date ? new Date(row.Date) : null,
        Amount: parseAmount(row.Amount),
        ActualQty: row["Actual Qty"]
          ? parseFloat(row["Actual Qty"].split(" ")[0])
          : 0,
        Unit: row["Actual Qty"] ? row["Actual Qty"].split(" ")[1] : "",
        RateValue: row.Rate ? parseFloat(row.Rate.split("/")[0]) : 0,
      };
    });

    // Top vendors by volume
    const vendorVolumeAnalysis = _.chain(cleanData)
      .groupBy("Party Name")
      .map((records, vendorName) => {
        const totalAmount = records.reduce(
          (sum, record) => sum + Math.abs(parseAmount(record.Amount)),
          0
        );
        const totalItems = records.reduce(
          (sum, record) => sum + record.ActualQty,
          0
        );

        return {
          vendorName,
          totalAmount,
          totalItems,
          recordCount: records.length,
        };
      })
      .orderBy(["totalAmount"], ["desc"])
      .take(10)
      .value();

    // Product category distribution
    const productCategoryAnalysis = _.chain(cleanData)
      .groupBy("Stock Item Name")
      .map((records, itemName) => {
        const totalAmount = records.reduce(
          (sum, record) => sum + Math.abs(parseAmount(record.Amount)),
          0
        );

        return {
          name: itemName,
          value: totalAmount,
          records: records.length,
        };
      })
      .orderBy(["value"], ["desc"])
      .value();

    // Purchase trends
    const purchaseTrendAnalysis = _.chain(cleanData)
      .filter(
        (record) =>
          record["Voucher Number"] &&
          record["Voucher Number"].toString().includes("/")
      )
      .map((record) => {
        const voucherParts = record["Voucher Number"].toString().split("/");
        const serialNumber = parseInt(voucherParts[voucherParts.length - 1]);

        return {
          ...record,
          serialNumber,
        };
      })
      .groupBy((record) => Math.floor(record.serialNumber / 10))
      .map((records, group: any) => {
        const totalAmount = records.reduce(
          (sum, record) => sum + Math.abs(parseAmount(record.Amount)),
          0
        );
        const voucherRange = `${group * 10 + 1}-${(parseInt(group) + 1) * 10}`;

        return {
          name: voucherRange,
          amount: totalAmount,
          count: records.length,
        };
      })
      .orderBy(["name"], ["asc"])
      .value();

    // Purchase quantity distribution
    const purchaseQtyAnalysis = _.chain(cleanData)
      .filter((record) => record.ActualQty > 0)
      .groupBy((record) => {
        if (record.ActualQty <= 1) return "1 unit";
        if (record.ActualQty <= 3) return "2-3 units";
        if (record.ActualQty <= 5) return "4-5 units";
        return "6+ units";
      })
      .map((records, qtyRange) => {
        const totalAmount = records.reduce(
          (sum, record) => sum + Math.abs(parseAmount(record.Amount)),
          0
        );

        return {
          name: qtyRange,
          value: records.length,
          amount: totalAmount,
        };
      })
      .orderBy(["name"], ["asc"])
      .value();

    // Purchase value distribution
    const purchaseValueAnalysis = _.chain(cleanData)
      .groupBy((record) => {
        const amount = Math.abs(parseAmount(record.Amount));
        if (amount <= 1000) return "≤ 1,000";
        if (amount <= 5000) return "1,001-5,000";
        if (amount <= 10000) return "5,001-10,000";
        if (amount <= 50000) return "10,001-50,000";
        return "> 50,000";
      })
      .map((records, valueRange) => {
        const totalAmount = records.reduce(
          (sum, record) => sum + Math.abs(parseAmount(record.Amount)),
          0
        );

        return {
          name: valueRange,
          value: records.length,
          amount: totalAmount,
        };
      })
      .orderBy(["name"], ["asc"])
      .value();

    // GST Registration type
    const gstRegistrationAnalysis = _.chain(cleanData)
      .groupBy("GST Registration Type")
      .map((records, regType) => {
        const totalAmount = records.reduce(
          (sum, record) => sum + Math.abs(parseAmount(record.Amount)),
          0
        );

        return {
          name: regType || "Unknown",
          value: records.length,
          amount: totalAmount,
        };
      })
      .value();

    return {
      topVendors: vendorVolumeAnalysis,
      productCategories: productCategoryAnalysis,
      purchaseTrends: purchaseTrendAnalysis,
      purchaseQtyDistribution: purchaseQtyAnalysis,
      purchaseValueDistribution: purchaseValueAnalysis,
      gstRegistrationTypes: gstRegistrationAnalysis,
    };
  };

  // Format currency
  const formatCurrency = (value: any) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip for charts

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-md rounded">
        <p className="font-bold">{label}</p>
        {payload.map((entry:any, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}:{" "}
            {entry.name.includes("amount") || entry.name === "totalAmount"
              ? formatCurrency(entry.value as number) // Ensure value is treated as a number
              : (entry.value as number).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Invoice Ledger Dashboard
      </h1>

      {/* Dashboard Content */}
      {dashboardData ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Total Vendors</h2>
              <p className="text-3xl font-bold text-blue-600">
                {dashboardData.topVendors.length}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Total Products</h2>
              <p className="text-3xl font-bold text-green-600">
                {dashboardData.productCategories.length}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">
                Total Purchase Value
              </h2>
              <p className="text-3xl font-bold text-amber-600">
                {formatCurrency(
                  _.sumBy(dashboardData.topVendors, "totalAmount")
                )}
              </p>
            </div>
          </div>

          {/* Top Vendors */}
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Top 10 Vendors by Purchase Value
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboardData.topVendors}
                  margin={{ top: 5, right: 30, left: 20, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="vendorName"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      formatCurrency(value).replace("₹", "")
                    }
                  />
             <Tooltip content={(props) => <CustomTooltip />} />

                  <Legend />
                  <Bar
                    dataKey="totalAmount"
                    name="Purchase Amount"
                    fill="#0088FE"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Categories & GST Registration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-4">
                Product Category Distribution
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.productCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {dashboardData.productCategories.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-4">
                GST Registration Types
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.gstRegistrationTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {dashboardData.gstRegistrationTypes.map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Purchase Trends & Purchase Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-4">Purchase Trends</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dashboardData.purchaseTrends}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      tickFormatter={(value) =>
                        formatCurrency(value).replace("₹", "")
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Purchase Amount"
                      stroke="#8884d8"
                      fill="#8884d8"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-4">
                Purchase Quantity Distribution
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dashboardData.purchaseQtyDistribution}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="value"
                      name="Number of Transactions"
                      fill="#82ca9d"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Purchase Value Distribution */}
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Purchase Value Distribution
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboardData.purchaseValueDistribution}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) =>
                      formatCurrency(value).replace("₹", "")
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="value"
                    name="Number of Transactions"
                    fill="#FF8042"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="amount"
                    name="Purchase Amount"
                    fill="#0088FE"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Key Insights</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Top Vendor:</strong>{" "}
                {dashboardData.topVendors[0]?.vendorName || "N/A"} -{" "}
                {formatCurrency(dashboardData.topVendors[0]?.totalAmount || 0)}
              </li>
              <li>
                <strong>Main Product Category:</strong>{" "}
                {dashboardData.productCategories[0]?.name || "N/A"} -{" "}
                {formatCurrency(dashboardData.productCategories[0]?.value || 0)}
              </li>
              <li>
                <strong>Average Transaction Value:</strong>{" "}
                {formatCurrency(
                  _.sumBy(dashboardData.topVendors, "totalAmount") /
                    dashboardData.purchaseValueDistribution.reduce(
                      (sum, item) => sum + item.value,
                      0
                    )
                )}
              </li>
              <li>
                <strong>Most Common Purchase Quantity:</strong>{" "}
                {_.maxBy(dashboardData.purchaseQtyDistribution, "value")
                  ?.name || "N/A"}
              </li>
              <li>
                <strong>Most Common Purchase Value Range:</strong>{" "}
                {_.maxBy(dashboardData.purchaseValueDistribution, "value")
                  ?.name || "N/A"}
              </li>
            </ul>
          </div>
        </>
      ) : (
        <div className="bg-white p-8 rounded shadow text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">
            No Dashboard Data Yet
          </h2>
          <p className="mt-2 text-gray-600">
            Upload an Excel file to generate the dashboard visualizations.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
