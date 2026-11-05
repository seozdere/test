export async function attachStudentNumbers(exam,client,token){
 const {data,error}=await client.rpc('cl_student_numbers_rpc',{p_token:token,p_action:'get',p_payload:{className:exam.className,subjectId:exam.subjectId,termId:exam.termId}});
 if(error||!data?.ok)throw Error('Öğrenci numaraları okunamadı. Bağlantıyı ve 39 numaralı SQL kurulumunu kontrol edin.');
 const counts=new Map();for(const s of exam.students)counts.set(s.name,(counts.get(s.name)||0)+1);
 exam.studentNumbers=Object.fromEntries(exam.students.map(s=>[s.id,counts.get(s.name)===1?data.value?.[s.name]?.number??'':'']));
 return exam;
}
