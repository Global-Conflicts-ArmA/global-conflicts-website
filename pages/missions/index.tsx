import Head from "next/head";
import { MainLayout } from "../../layouts/main-layout";

 

import DataTable from 'react-data-table-component';

const columns = [
    {
        name: 'Title',
        selector: row => row.title,
        sortable: true,
    },
    {
        name: 'Year',
        selector: row => row.year,
        sortable: true,
    },
];

const data = [
    {
        id: 1,
        title: 'Beetlejuice',
        year: '1988',
    },
    {
        id: 2,
        title: 'Ghostbusters',
        year: '1984',
    },
]



function MissionList() {
	return (
		<>
		   <DataTable
            columns={columns}
            data={data}
        />
		</>
	);
}

// // This gets called on every request
// export async function getServerSideProps() {
//    // Fetch data from external API
//    const res = await fetch(`https://.../data`)
//    const data = await res.json()
 
//    // Pass data to the page via props
//    return { props: { data } }
//  }

MissionList.PageLayout = MainLayout;

export default MissionList;
